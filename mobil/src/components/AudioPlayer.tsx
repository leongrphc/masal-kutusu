import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { Colors, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { GlassCard } from './GlassCard';
import { File, Paths } from 'expo-file-system/next';

interface AudioPlayerProps {
  audioBase64: string;
  mimeType: string;
}

const SPEED_OPTIONS = [0.9, 1.0, 1.1] as const;
const SEEK_SECONDS = 10;

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function getAudioExtension(mimeType: string) {
  if (mimeType.includes('mpeg')) {
    return 'mp3';
  }

  if (mimeType.includes('wav')) {
    return 'wav';
  }

  return 'audio';
}

export function AudioPlayer({ audioBase64, mimeType }: AudioPlayerProps) {
  const { colors } = useTheme();
  const soundRef = useRef<Audio.Sound | null>(null);
  const pulseAnims = useRef(Array.from({ length: 20 }, () => new Animated.Value(0.2))).current;
  const [isReady, setIsReady] = useState(false);
  const [isPreparing, setIsPreparing] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  useEffect(() => {
    let isMounted = true;

    const prepareAudio = async () => {
      setIsPreparing(true);
      setAudioError(null);
      setIsReady(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);

      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
          soundRef.current = null;
        }

        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
        });

        const audioFile = new File(Paths.cache, `masal_audio.${getAudioExtension(mimeType)}`);
        audioFile.write(base64ToUint8Array(audioBase64));

        const { sound: newSound, status } = await Audio.Sound.createAsync(
          { uri: audioFile.uri },
          {
            shouldPlay: false,
            progressUpdateIntervalMillis: 250,
          },
          onPlaybackStatusUpdate,
        );

        if (!isMounted) {
          await newSound.unloadAsync();
          return;
        }

        soundRef.current = newSound;
        setIsReady(true);

        if (status.isLoaded) {
          setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
        }
      } catch (error) {
        console.error('Audio yükleme hatası:', error);
        if (isMounted) {
          setAudioError('Ses oynatıcı hazırlanamadı.');
        }
      } finally {
        if (isMounted) {
          setIsPreparing(false);
        }
      }
    };

    void prepareAudio();

    return () => {
      isMounted = false;
      const currentSound = soundRef.current;
      soundRef.current = null;
      if (currentSound) {
        void currentSound.unloadAsync();
      }
    };
  }, [audioBase64, mimeType]);

  useEffect(() => {
    if (isPlaying) {
      startWaveAnimation();
    } else {
      stopWaveAnimation();
    }
  }, [isPlaying]);

  const startWaveAnimation = () => {
    const animations = pulseAnims.map((anim) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: Math.random(),
            duration: 400 + Math.random() * 400,
            useNativeDriver: false,
          }),
          Animated.timing(anim, {
            toValue: 0.15 + Math.random() * 0.2,
            duration: 400 + Math.random() * 400,
            useNativeDriver: false,
          }),
        ]),
      ),
    );

    Animated.parallel(animations).start();
  };

  const stopWaveAnimation = () => {
    pulseAnims.forEach((anim) => {
      anim.stopAnimation();
      Animated.timing(anim, {
        toValue: 0.2,
        duration: 300,
        useNativeDriver: false,
      }).start();
    });
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      return;
    }

    setCurrentTime(status.positionMillis / 1000);
    setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
    setIsPlaying(status.isPlaying);

    if (status.didJustFinish) {
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    const sound = soundRef.current;
    if (!sound || !isReady || isPreparing || audioError) {
      return;
    }

    if (isPlaying) {
      await sound.pauseAsync();
      return;
    }

    if (duration > 0 && currentTime >= duration - 0.25) {
      await sound.setPositionAsync(0);
    }

    await sound.playAsync();
  };

  const seekBy = async (seconds: number) => {
    const sound = soundRef.current;
    if (!sound || !isReady || duration <= 0) {
      return;
    }

    const nextTime = Math.max(0, Math.min(currentTime + seconds, duration));
    await sound.setPositionAsync(nextTime * 1000);
    setCurrentTime(nextTime);
  };

  const restartAudio = async () => {
    const sound = soundRef.current;
    if (!sound || !isReady) {
      return;
    }

    await sound.setPositionAsync(0);
    setCurrentTime(0);
  };

  const changePlaybackRate = async (rate: number) => {
    const sound = soundRef.current;
    if (!sound || !isReady) {
      return;
    }

    await sound.setRateAsync(rate, true);
    setPlaybackRate(rate);
  };

  const formatTime = (time: number) => {
    if (Number.isNaN(time)) {
      return '0:00';
    }

    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const controlsDisabled = !isReady || isPreparing || !!audioError;

  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Sesli Anlatım</Text>
        </View>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
      </View>

      <View style={styles.playContainer}>
        <TouchableOpacity
          onPress={() => {
            void togglePlay();
          }}
          activeOpacity={0.8}
          disabled={controlsDisabled}
          style={[styles.playButton, controlsDisabled && styles.playButtonDisabled]}
        >
          {isPreparing ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : isPlaying ? (
            <View style={styles.pauseIcon}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          ) : (
            <View style={styles.playIcon} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: colors.inputBorder }]}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {audioError ? (
        <Text style={[styles.statusText, styles.errorText]}>{audioError}</Text>
      ) : isPreparing ? (
        <Text style={[styles.statusText, { color: colors.textMuted }]}>Ses hazırlanıyor...</Text>
      ) : (
        <Text style={[styles.statusText, { color: colors.textMuted }]}>10 sn ileri/geri sarabilir veya başa dönebilirsiniz.</Text>
      )}

      <View style={styles.seekControls}>
        <TouchableOpacity
          onPress={() => {
            void seekBy(-SEEK_SECONDS);
          }}
          disabled={controlsDisabled}
          style={[
            styles.seekButton,
            { backgroundColor: colors.surface, borderColor: colors.inputBorder },
            controlsDisabled && styles.seekButtonDisabled,
          ]}
        >
          <Text style={[styles.seekButtonText, { color: colors.text }]}>-10 sn</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            void restartAudio();
          }}
          disabled={controlsDisabled}
          style={[
            styles.seekButton,
            { backgroundColor: colors.surface, borderColor: colors.inputBorder },
            controlsDisabled && styles.seekButtonDisabled,
          ]}
        >
          <Text style={[styles.seekButtonText, { color: colors.text }]}>Başa Dön</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            void seekBy(SEEK_SECONDS);
          }}
          disabled={controlsDisabled}
          style={[
            styles.seekButton,
            { backgroundColor: colors.surface, borderColor: colors.inputBorder },
            controlsDisabled && styles.seekButtonDisabled,
          ]}
        >
          <Text style={[styles.seekButtonText, { color: colors.text }]}>+10 sn</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.speedContainer}>
        <Text style={[styles.speedLabel, { color: colors.textMuted }]}>Hız:</Text>
        {SPEED_OPTIONS.map((rate) => (
          <TouchableOpacity
            key={rate}
            onPress={() => {
              void changePlaybackRate(rate);
            }}
            disabled={controlsDisabled}
            style={[
              styles.speedButton,
              playbackRate === rate && styles.speedButtonActive,
              controlsDisabled && styles.speedButtonDisabled,
            ]}
          >
            <Text
              style={[
                styles.speedButtonText,
                playbackRate === rate && styles.speedButtonTextActive,
              ]}
            >
              {rate}x
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.waveContainer}>
        {pulseAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.waveBar,
              {
                height: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['10%', '100%'],
                }),
                backgroundColor: isPlaying ? Colors.primary[400] : Colors.neutral[300],
              },
            ]}
          />
        ))}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary[500],
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
  },
  playContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  playButtonDisabled: {
    opacity: 0.65,
  },
  pauseIcon: {
    flexDirection: 'row',
    gap: 6,
  },
  pauseBar: {
    width: 6,
    height: 28,
    backgroundColor: Colors.white,
    borderRadius: 2,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderTopWidth: 14,
    borderBottomWidth: 14,
    borderLeftColor: Colors.white,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 4,
  },
  progressContainer: {
    paddingHorizontal: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary[500],
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    textAlign: 'center',
  },
  errorText: {
    color: Colors.error,
    fontWeight: '600',
  },
  seekControls: {
    flexDirection: 'row',
    gap: 8,
  },
  seekButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  seekButtonDisabled: {
    opacity: 0.5,
  },
  seekButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  speedLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  speedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  speedButtonActive: {
    backgroundColor: Colors.primary[500],
  },
  speedButtonDisabled: {
    opacity: 0.5,
  },
  speedButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  speedButtonTextActive: {
    color: Colors.white,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: 48,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
});
