import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { Colors, BorderRadius } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { GlassCard } from './GlassCard';
import { File, Paths } from 'expo-file-system/next';

interface AudioPlayerProps {
  audioBase64: string;
  mimeType: string;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function AudioPlayer({ audioBase64, mimeType }: AudioPlayerProps) {
  const { colors } = useTheme();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const pulseAnims = useRef(Array.from({ length: 20 }, () => new Animated.Value(0.2))).current;

  useEffect(() => {
    loadAudio();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [audioBase64]);

  useEffect(() => {
    if (isPlaying) {
      startWaveAnimation();
    } else {
      stopWaveAnimation();
    }
  }, [isPlaying]);

  const startWaveAnimation = () => {
    const animations = pulseAnims.map((anim, i) =>
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
        ])
      )
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

  const loadAudio = async () => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const audioFile = new File(Paths.cache, 'masal_audio.wav');
      const bytes = base64ToUint8Array(audioBase64);
      audioFile.write(bytes);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioFile.uri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
    } catch (error) {
      console.error('Audio yükleme hatası:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setCurrentTime(status.positionMillis / 1000);
      setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };

  const togglePlay = async () => {
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
    setIsPlaying(!isPlaying);
  };

  const changePlaybackRate = async (rate: number) => {
    if (!sound) return;
    await sound.setRateAsync(rate, true);
    setPlaybackRate(rate);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <GlassCard style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>Ses Kaydı</Text>
        </View>
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
      </View>

      {/* Play Button */}
      <View style={styles.playContainer}>
        <TouchableOpacity onPress={togglePlay} activeOpacity={0.8} style={styles.playButton}>
          {isPlaying ? (
            <View style={styles.pauseIcon}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          ) : (
            <View style={styles.playIcon} />
          )}
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: colors.inputBorder }]}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>

      {/* Speed Controls */}
      <View style={styles.speedContainer}>
        <Text style={[styles.speedLabel, { color: colors.textMuted }]}>Hız:</Text>
        {[0.9, 1.0, 1.1].map((rate) => (
          <TouchableOpacity
            key={rate}
            onPress={() => changePlaybackRate(rate)}
            style={[
              styles.speedButton,
              playbackRate === rate && styles.speedButtonActive,
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

      {/* Waveform */}
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
