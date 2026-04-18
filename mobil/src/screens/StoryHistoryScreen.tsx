import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { GradientBackground } from '../components/GradientBackground';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { AudioPlayer } from '../components/AudioPlayer';
import { BorderRadius, Colors } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import {
  getStoryHistory,
  removeStoryFromHistory,
  toggleFavoriteStory,
  StoryHistoryEntry,
} from '../lib/storyHistory';

const THEME_LABELS: Record<StoryHistoryEntry['theme'], string> = {
  friendship: 'Arkadaşlık',
  courage: 'Cesaret',
  sharing: 'Paylaşmak',
  emotions: 'Duygular',
};

type HistoryFilter = 'all' | 'favorites' | 'audio';

export default function StoryHistoryScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [history, setHistory] = useState<StoryHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('all');

  const loadHistory = useCallback(async () => {
    if (!user) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const nextHistory = await getStoryHistory(user.id);
    setHistory(nextHistory);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleToggleFavorite = async (story: StoryHistoryEntry) => {
    if (!user) {
      return;
    }

    const nextHistory = await toggleFavoriteStory(user.id, story.id);
    setHistory(nextHistory);
  };

  const favoriteCount = history.filter((story) => story.isFavorite).length;
  const audioCount = history.filter((story) => Boolean(story.audioBase64 && story.mimeType)).length;

  const filteredHistory = useMemo(() => {
    if (activeFilter === 'favorites') {
      return history.filter((story) => story.isFavorite);
    }

    if (activeFilter === 'audio') {
      return history.filter((story) => Boolean(story.audioBase64 && story.mimeType));
    }

    return history;
  }, [activeFilter, history]);

  const handleDeleteStory = (story: StoryHistoryEntry) => {
    Alert.alert('Masalı sil', 'Bu masalı cihaz geçmişinden kaldırmak istiyor musunuz?', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          if (!user) {
            return;
          }

          const nextHistory = await removeStoryFromHistory(user.id, story.id);
          setHistory(nextHistory);
          if (expandedStoryId === story.id) {
            setExpandedStoryId(null);
          }
        },
      },
    ]);
  };

  return (
    <GradientBackground>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>Masal Geçmişi</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ürettiğiniz son masallara buradan tekrar ulaşabilirsiniz.</Text>
          </View>
          <Button title="Yeni Masal" onPress={() => navigation.navigate('CreateStory')} variant="secondary" />
        </View>

        {loading ? (
          <GlassCard>
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={Colors.primary[500]} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Geçmiş yükleniyor...</Text>
            </View>
          </GlassCard>
        ) : history.length === 0 ? (
          <GlassCard>
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📚</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Henüz kayıtlı masal yok</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Yeni oluşturduğunuz masallar burada otomatik olarak görünecek.</Text>
              <Button title="İlk Masalını Oluştur" onPress={() => navigation.navigate('CreateStory')} fullWidth style={{ marginTop: 8 }} />
            </View>
          </GlassCard>
        ) : (
          <>
            <View style={styles.filterContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
              >
                <TouchableOpacity
                  onPress={() => setActiveFilter('all')}
                  style={[
                    styles.filterChip,
                    activeFilter === 'all' && styles.filterChipActive,
                    { borderColor: activeFilter === 'all' ? 'rgba(255,127,80,0.3)' : colors.inputBorder },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: activeFilter === 'all' ? Colors.primary[700] : colors.textSecondary }]}>
                    Tümü ({history.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveFilter('favorites')}
                  style={[
                    styles.filterChip,
                    activeFilter === 'favorites' && styles.filterChipActive,
                    { borderColor: activeFilter === 'favorites' ? 'rgba(255,127,80,0.3)' : colors.inputBorder },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: activeFilter === 'favorites' ? Colors.primary[700] : colors.textSecondary }]}>
                    ★ Favoriler ({favoriteCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setActiveFilter('audio')}
                  style={[
                    styles.filterChip,
                    activeFilter === 'audio' && styles.filterChipActive,
                    { borderColor: activeFilter === 'audio' ? 'rgba(255,127,80,0.3)' : colors.inputBorder },
                  ]}
                >
                  <Text style={[styles.filterChipText, { color: activeFilter === 'audio' ? Colors.primary[700] : colors.textSecondary }]}>
                    🎧 Sesli ({audioCount})
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {filteredHistory.length === 0 ? (
              <GlassCard>
                <View style={styles.emptyState}>
                  <Text style={styles.emptyEmoji}>{activeFilter === 'favorites' ? '⭐' : '🎧'}</Text>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>
                    {activeFilter === 'favorites' ? 'Henüz favori masal yok' : 'Henüz sesli masal yok'}
                  </Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    {activeFilter === 'favorites'
                      ? 'Beğendiğiniz masalları favorilere ekleyerek buradan hızlıca erişebilirsiniz.'
                      : 'Sesli ürettiğiniz masallar burada görünecek.'}
                  </Text>
                  <Button title="Tüm Masalları Göster" onPress={() => setActiveFilter('all')} variant="secondary" fullWidth style={{ marginTop: 8 }} />
                </View>
              </GlassCard>
            ) : (
          <View style={styles.historyList}>
            {filteredHistory.map((story) => {
              const isExpanded = expandedStoryId === story.id;

              return (
                <GlassCard key={story.id} style={styles.storyCard}>
                  <View style={styles.storyHeader}>
                    <View style={styles.storyHeaderContent}>
                      <Text style={[styles.storyTopic, { color: colors.text }]}>{story.topic}</Text>
                      <Text style={[styles.storyMeta, { color: colors.textMuted }]}>
                        {new Date(story.createdAt).toLocaleDateString('tr-TR')} · {story.storyLength} karakter
                      </Text>
                    </View>
                    <View style={styles.headerBadges}>
                      {story.isFavorite ? (
                        <View style={styles.favoriteBadge}>
                          <Text style={styles.favoriteBadgeText}>★ Favori</Text>
                        </View>
                      ) : null}
                      <View style={[styles.themeBadge, { backgroundColor: 'rgba(255,127,80,0.12)' }]}>
                        <Text style={styles.themeBadgeText}>{THEME_LABELS[story.theme]}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>{story.ageRange} yaş</Text>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>{story.length === 'short' ? 'Kısa' : 'Orta'} masal</Text>
                  </View>

                  <Text style={[styles.storyPreview, { color: colors.textSecondary }]} numberOfLines={isExpanded ? undefined : 4}>
                    {story.story}
                  </Text>

                  {(story.audioBase64 || story.audioFileUri) && story.mimeType ? (
                    <AudioPlayer
                      audioBase64={story.audioBase64}
                      audioUri={story.audioFileUri}
                      mimeType={story.mimeType}
                    />
                  ) : null}

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => setExpandedStoryId(isExpanded ? null : story.id)}
                      style={[styles.actionButton, { borderColor: colors.inputBorder, backgroundColor: colors.surface }]}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.text }]}>{isExpanded ? 'Daha Az Göster' : 'Tamamını Oku'}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleToggleFavorite(story)}
                      style={[
                        styles.actionButton,
                        story.isFavorite ? styles.favoriteActionButton : { borderColor: colors.inputBorder, backgroundColor: colors.surface },
                      ]}
                    >
                      <Text style={[styles.actionButtonText, story.isFavorite ? styles.favoriteActionButtonText : { color: colors.text }]}>
                        {story.isFavorite ? 'Favoriden Çıkar' : 'Favorile'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('CreateStory', {
                        topic: story.topic,
                        ageRange: story.ageRange,
                        length: story.length,
                        theme: story.theme,
                      })}
                      style={[styles.actionButton, { borderColor: colors.inputBorder, backgroundColor: colors.surface }]}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.text }]}>Benzerini Üret</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeleteStory(story)}
                      style={[styles.actionButton, styles.deleteButton]}
                    >
                      <Text style={styles.deleteButtonText}>Sil</Text>
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              );
            })}
          </View>
            )}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    maxWidth: 240,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 12,
  },
  filterContainer: {
    marginHorizontal: -16,
    marginBottom: 16,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,127,80,0.12)',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 24,
  },
  emptyEmoji: {
    fontSize: 42,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  historyList: {
    gap: 12,
  },
  storyCard: {
    gap: 12,
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  storyHeaderContent: {
    flex: 1,
    gap: 4,
  },
  storyTopic: {
    fontSize: 18,
    fontWeight: '700',
  },
  storyMeta: {
    fontSize: 12,
  },
  headerBadges: {
    alignItems: 'flex-end',
    gap: 8,
  },
  favoriteBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(245,158,11,0.14)',
  },
  favoriteBadgeText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  themeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  themeBadgeText: {
    color: Colors.primary[700],
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  detailText: {
    fontSize: 12,
    fontWeight: '600',
  },
  storyPreview: {
    fontSize: 15,
    lineHeight: 24,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  favoriteActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderColor: 'rgba(245,158,11,0.24)',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  favoriteActionButtonText: {
    color: '#B45309',
  },
  deleteButton: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor: 'rgba(239,68,68,0.24)',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
});
