// screens/RewardsScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, ScrollView, Platform, StatusBar,
  TouchableOpacity, Modal, Pressable, Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { config } from '../gluestack-ui.config';
import BottomNavBar from '../components/BottomNavBar';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection, collectionGroup, doc, onSnapshot, orderBy, query, updateDoc, where,
  Timestamp, serverTimestamp, setDoc, getDoc,
} from 'firebase/firestore';
import { ensureMonthlyPack, monthKey } from '../services/rewards';

const { width } = Dimensions.get('window');

const colors = {
  blue:   (config as any)?.theme?.colors?.blue  ?? '#73C3D1',
  white:  (config as any)?.theme?.colors?.white ?? '#F8F7F4',
  accent: (config as any)?.theme?.colors?.o     ?? '#EE734A',
  text:   (config as any)?.theme?.colors?.text  ?? '#1C1C1C',
};

const NAV_H = 64;
const NAV_MARGIN = 8;
const ROW_RADIUS = 18;

/* ---------- Types ---------- */
type RewardType = 'bath' | 'treats' | 'toy' | 'vet' | 'grooming' | 'kibble' | 'other';
type EarnedReward = {
  id: string;
  title: string;
  sponsor: string;
  type: RewardType;
  status: 'earned' | 'redeemed' | 'expired';
  createdAt?: Timestamp | null;
  expiresAt?: Timestamp | null;
  redeemedAt?: Timestamp | null;
  description?: string;
  terms?: string;
  code?: string;
  goalId?: string;
};
type NextReward = {
  id: string;
  title: string;
  requiredActivity: string;  // short “what to do”
  progressPct: number;       // 0..100 (driven by linked task)
  taskId?: string;
  sponsor?: string;
  type?: RewardType;
  description?: string;
  terms?: string;
  expiresAt?: Timestamp | null;
};
type RewardTask = {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  target: number;
  count: number;
  month?: string;
  challengeId?: string;      // added by ensureMonthlyPack
};

type ActivityKey =
  | 'morning_walk' | 'evening_walk' | 'park_play' | 'training'
  | 'swim' | 'hike' | 'grooming' | 'feeding' | 'meds';

type ActivityDoc = {
  type: ActivityKey;
  createdAt?: Timestamp | null;
  petId?: string;
};

const TYPE_ICON: Record<RewardType, keyof typeof Ionicons.glyphMap> = {
  bath: 'water',
  treats: 'restaurant',
  toy: 'gift',
  vet: 'medkit',
  grooming: 'cut',
  kibble: 'nutrition',
  other: 'pricetag',
};

const fmtDate = (ts?: Timestamp | null) => {
  if (!ts) return '—';
  const d = ts.toDate();
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

/** Map catalog challenge → activity filter (count only real activities) */
const CHALLENGE_MATCH: Record<string, (a: ActivityDoc) => boolean> = {
  // ids from services/rewards.ts CATALOG
  'park-3x':      (a) => a.type === 'park_play',
  'am-walk-5x':   (a) => a.type === 'morning_walk',
  'training-2x':  (a) => a.type === 'training',
  'groom-1x':     (a) => a.type === 'grooming',
  'vet-1x':       (a) => a.type === 'meds',        // treating “health check” as meds log
  'kibble-steps': (_a) => true,                    // any logged activity counts
};

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const padBottom = NAV_H + Math.max(insets.bottom, NAV_MARGIN) + 16;
  const { user } = useAuth();
  const thisMonth = monthKey();

  // data
  const [earned, setEarned] = useState<EarnedReward[]>([]);
  const [nextRewards, setNextRewards] = useState<NextReward[]>([]);
  const [tasks, setTasks] = useState<RewardTask[]>([]);

  // modal
  const [openReward, setOpenReward] = useState<EarnedReward | NextReward | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  /* ------ 1) Ensure a monthly pack exists (once per month per user) ------ */
  useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      try {
        await ensureMonthlyPack(user.uid);
      } catch (e) {
        console.warn('ensureMonthlyPack failed', e);
      }
    })();
  }, [user?.uid]);

  /* ------ 2) Listen: tasks & goals for this month ------ */
  useEffect(() => {
    if (!user?.uid) { setTasks([]); return; }
    const ref = collection(db, 'users', user.uid, 'rewardTasks');
    const qy = query(ref, where('month', '==', thisMonth), orderBy('title', 'asc'));
    return onSnapshot(qy, (snap) => {
      const rows: RewardTask[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: x.id ?? d.id,
          title: x.title ?? '',
          icon: (x.icon as RewardTask['icon']) ?? 'pricetag',
          target: Number(x.target ?? 1),
          count: Number(x.count ?? 0),
          month: x.month,
          challengeId: x.challengeId,
        };
      });
      setTasks(rows);
    });
  }, [user?.uid, thisMonth]);

  useEffect(() => {
    if (!user?.uid) { setNextRewards([]); return; }
    const ref = collection(db, 'users', user.uid, 'rewardGoals');
    const qy = query(ref, where('month', '==', thisMonth), orderBy('title', 'asc'));
    return onSnapshot(qy, (snap) => {
      const rows: NextReward[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: x.id ?? d.id,
          title: x.title ?? '',
          requiredActivity: x.requiredActivity ?? '',
          progressPct: Number(x.progressPct ?? 0),
          taskId: x.taskId,
          sponsor: x.sponsor,
          type: x.type,
          description: x.description ?? '',
          terms: x.terms ?? '',
          expiresAt: x.expiresAt ?? null,
        };
      });
      setNextRewards(rows);
    });
  }, [user?.uid, thisMonth]);

  /* ------ 3) NEW: derive task counts from this month's Activities (collection group) ------ */
  useEffect(() => {
    if (!user?.uid) return;

    // Month range
    const start = new Date(); start.setDate(1); start.setHours(0,0,0,0);
    const end = new Date(start); end.setMonth(end.getMonth() + 1);

    // Count all activities in this month (across user’s pets)
    const qActs = query(
  collectionGroup(db, 'activities'),
  where('userId', '==', user.uid),          
  where('createdAt', '>=', Timestamp.fromDate(start)),
  where('createdAt', '<',  Timestamp.fromDate(end))
);

    return onSnapshot(
      qActs,
      async (snap) => {
        const acts: ActivityDoc[] = snap.docs.map(d => (d.data() as any) as ActivityDoc);

        // compute new counts per task
        const updates: Array<{ taskId: string; newCount: number }> = [];
        for (const t of tasks) {
          const challengeId = t.challengeId;
          if (!challengeId) continue;
          const match = CHALLENGE_MATCH[challengeId];
          if (!match) continue;

          const rawCount = acts.reduce((n, a) => n + (match(a) ? 1 : 0), 0);
          const capped = Math.min(t.target, rawCount);
          if (capped !== t.count) updates.push({ taskId: t.id, newCount: capped });
        }

        // persist (triggers your existing progress & earning effects)
        for (const u of updates) {
          try {
            await setDoc(
              doc(db, 'users', user.uid, 'rewardTasks', u.taskId),
              { count: u.newCount },
              { merge: true }
            );
          } catch (e) {
            console.warn('Failed to update task count from activities', u.taskId, e);
          }
        }
      },
      (err) => console.warn('activities (month) snapshot error:', err)
    );
  }, [user?.uid, tasks, thisMonth]);

  /* ------ 4) Mirror: update each goal’s progress from its linked task ------ */
  useEffect(() => {
    if (!user?.uid) return;
    const byId = new Map(tasks.map((t) => [t.id, t]));
    nextRewards.forEach(async (g) => {
      if (!g.taskId) return;
      const t = byId.get(g.taskId);
      if (!t) return;
      const pct = t.target > 0 ? Math.round((t.count / t.target) * 100) : 0;
      if (pct !== g.progressPct) {
        try {
          await updateDoc(doc(db, 'users', user.uid, 'rewardGoals', g.id), { progressPct: pct });
        } catch {}
      }
    });
  }, [user?.uid, tasks, nextRewards]);

  /* ------ 5) When a task completes, create/ensure an “earned” reward doc ------ */
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      for (const g of nextRewards) {
        if (!g.taskId) continue;
        const t = tasks.find((x) => x.id === g.taskId);
        if (!t || t.count < t.target || !g.type || !g.sponsor) continue;

        // reward id = goal id (idempotent)
        const rRef = doc(db, 'users', user.uid, 'rewards', g.id);
        const rSnap = await getDoc(rRef);
        if (rSnap.exists()) continue;

        await setDoc(
          rRef,
          {
            id: g.id,
            goalId: g.id,
            title: g.title,
            sponsor: g.sponsor,
            type: g.type,
            status: 'earned',
            createdAt: serverTimestamp(),
            expiresAt: g.expiresAt ?? null,
            description: g.description ?? '',
            terms: g.terms ?? '',
          } as EarnedReward,
          { merge: true }
        );
      }
    })();
  }, [user?.uid, tasks, nextRewards]);

  /* ------ Earned rewards (status == 'earned') ------ */
  useEffect(() => {
    if (!user?.uid) { setEarned([]); return; }
    const ref = collection(db, 'users', user.uid, 'rewards');
    const qy = query(ref, where('status', '==', 'earned'), orderBy('expiresAt', 'asc'));
    return onSnapshot(qy, (snap) => {
      const rows: EarnedReward[] = snap.docs.map((d) => {
        const x = d.data() as any;
        return {
          id: d.id,
          title: x.title ?? '',
          sponsor: x.sponsor ?? '',
          type: (x.type as RewardType) ?? 'other',
          status: (x.status as EarnedReward['status']) ?? 'earned',
          createdAt: x.createdAt ?? null,
          expiresAt: x.expiresAt ?? null,
          redeemedAt: x.redeemedAt ?? null,
          description: x.description ?? '',
          terms: x.terms ?? '',
          code: x.code ?? '',
          goalId: x.goalId ?? d.id,
        };
      });
      setEarned(rows);
    });
  }, [user?.uid]);

  /* ------ Actions ------ */
  const redeemReward = async (r: EarnedReward) => {
    if (!user?.uid) { Alert.alert('Sign in required', 'Please sign in to redeem rewards.'); return; }
    setRedeeming(true);
    try {
      await updateDoc(doc(db, 'users', user.uid, 'rewards', r.id), {
        status: 'redeemed',
        redeemedAt: serverTimestamp(),
      });
      setOpenReward(null);
      Alert.alert('Redeemed', 'Your reward was moved to Archives.');
    } catch (e: any) {
      Alert.alert('Redeem failed', e?.message ?? 'Please try again.');
    } finally {
      setRedeeming(false);
    }
  };

  const tasksById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.white }]} edges={['left', 'right']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={{ flex: 1, backgroundColor: colors.white }}>
        <ScrollView contentContainerStyle={{ paddingBottom: padBottom }}>
          {/* Blob */}
          <View style={styles.blob} pointerEvents="none" />

          {/* Header */}
          <View style={styles.headerTextWrap}>
            <Text style={styles.welcome}>HEY LOOK,{'\n'}YOU'VE MADE IT</Text>
          </View>

          {/* Pill */}
          <View style={styles.pillWrap}>
            <View style={[styles.pill, styles.cardShadow]}>
              <Text style={[styles.pillText, { color: colors.accent }]}>REWARDS</Text>
            </View>
          </View>

          {/* ===== Challenges This Month (icon buttons) ===== */}
          <Text style={[styles.sectionLabel, { marginTop: 50 }]}>CHALLENGES THIS MONTH</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 22, gap: 12 }}
          >
            {nextRewards.length === 0 ? (
              <View style={[styles.iconCard, styles.listShadow]}>
                <Text style={{ fontWeight: '800', color: '#6E6E6E' }}>No challenges yet</Text>
              </View>
            ) : (
              nextRewards.map((g) => {
                const linked = g.taskId ? tasksById.get(g.taskId) : undefined;
                const iconName =
                  (g.type && TYPE_ICON[g.type]) ||
                  (linked?.icon as keyof typeof Ionicons.glyphMap) ||
                  'pricetag';
                return (
                  <TouchableOpacity
                    key={g.id}
                    activeOpacity={0.85}
                    onPress={() => setOpenReward(g)}
                    style={[styles.iconCard, styles.listShadow]}
                  >
                    <View style={styles.bigIconBubble}>
                      <Ionicons name={iconName} size={28} color={colors.blue} />
                    </View>
                    <Text style={styles.iconCardText} numberOfLines={2}>
                      {g.requiredActivity}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* ===== Earned Rewards ===== */}
          <Text style={[styles.sectionLabel, { marginTop: 24 }]}>EARNED REWARDS</Text>
          <View style={styles.list}>
            {earned.length === 0 ? (
              <Text style={{ color: '#6E6E6E', fontWeight: '700', paddingHorizontal: 22 }}>No rewards yet</Text>
            ) : (
              earned.map((item) => {
                const icon = TYPE_ICON[item.type] ?? TYPE_ICON.other;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={() => setOpenReward(item)}
                    style={[styles.listItem, styles.listShadow]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={styles.iconBubble}>
                        <Ionicons name={icon} size={20} color={colors.blue} />
                      </View>
                      <View>
                        <Text style={styles.listTitle}>{item.title}</Text>
                        <Text style={styles.listMeta}>
                          {item.sponsor} • {fmtDate(item.expiresAt)}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#8A8A8A" />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          {/* ===== Next Reward (progress) ===== */}
          <Text style={[styles.sectionLabel, { marginTop: 30 }]}>NEXT REWARD</Text>
          <View style={{ paddingHorizontal: 22 }}>
            {nextRewards.length === 0 ? (
              <Text style={{ color: '#6E6E6E', fontWeight: '700' }}>No goals yet</Text>
            ) : (
              nextRewards.map((u) => (
                <View key={u.id} style={[styles.row, { borderColor: colors.accent }]}>
                  <View style={{ flex: 1.2, paddingRight: 8 }}>
                    <Text style={styles.cellLeft} numberOfLines={1}>{u.title}</Text>
                    <Text style={styles.goalMeta} numberOfLines={1}>{u.requiredActivity}</Text>
                  </View>
                  <Text style={styles.cellRight} numberOfLines={1}>
                    {`${Math.max(0, Math.min(100, Math.round(u.progressPct)))}%`}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* (No “TO-DO TO EARN” section anymore) */}
        </ScrollView>

        <BottomNavBar />
      </View>

      {/* Details / Redeem modal (works for Earned or Challenge/Next rows) */}
      <Modal visible={!!openReward} transparent animationType="fade" onRequestClose={() => setOpenReward(null)}>
        <Pressable style={m.overlay} onPress={() => setOpenReward(null)} />
        <View style={[m.card, styles.cardShadow]}>
          {openReward && (
            <>
              <View style={{ alignItems: 'center', marginBottom: 12 }}>
                <View style={styles.bigIconBubble}>
                  <Ionicons
                    name={
                      'type' in openReward
                        ? TYPE_ICON[(openReward as any).type as RewardType] ?? 'pricetag'
                        : 'gift'
                    }
                    size={28}
                    color={colors.blue}
                  />
                </View>
                <Text style={m.title}>{openReward.title}</Text>
                {'sponsor' in openReward && !!(openReward as any).sponsor && (
                  <Text style={m.subtitle}>{(openReward as any).sponsor}</Text>
                )}
              </View>

              {'expiresAt' in openReward && (
                <View style={m.row}>
                  <Text style={m.label}>Expires</Text>
                  <Text style={m.value}>{fmtDate((openReward as any).expiresAt)}</Text>
                </View>
              )}

              {'requiredActivity' in openReward && (
                <View style={m.row}>
                  <Text style={m.label}>Required activity</Text>
                  <Text style={m.value}>{(openReward as NextReward).requiredActivity}</Text>
                </View>
              )}

              {'description' in openReward && !!(openReward as any).description && (
                <View style={m.block}>
                  <Text style={m.blockLabel}>Details</Text>
                  <Text style={m.blockText}>{(openReward as any).description}</Text>
                </View>
              )}

              {'terms' in openReward && !!(openReward as any).terms && (
                <View style={m.block}>
                  <Text style={m.blockLabel}>Terms</Text>
                  <Text style={m.blockText}>{(openReward as any).terms}</Text>
                </View>
              )}

              {/* Only show redeem for already-earned rewards */}
              {'status' in openReward && (openReward as EarnedReward).status === 'earned' ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => redeemReward(openReward as EarnedReward)}
                  style={[m.redeemBtn, redeeming && { opacity: 0.7 }]}
                  disabled={redeeming}
                >
                  <Text style={m.redeemText}>{redeeming ? 'Redeeming…' : 'Redeem & Archive'}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity activeOpacity={0.9} onPress={() => setOpenReward(null)} style={m.cancelBtn}>
                <Text style={m.cancelText}>Close</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  safe: { flex: 1 },

  headerTextWrap: { marginTop: 125, alignItems: 'flex-end', paddingHorizontal: 22 },
  welcome: { fontSize: 26, fontWeight: '900', textAlign: 'right', lineHeight: 28 },

  pillWrap: { marginTop: 55, paddingHorizontal: 22, width: '100%' },
  pill: {
    height: 56, borderRadius: 28, backgroundColor: '#e9e8e6ff',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', paddingHorizontal: 80,
  },
  pillText: { fontWeight: '900', fontSize: 18, letterSpacing: 0.3 },

  sectionLabel: {
    marginTop: 45, color: '#6E6E6E', fontWeight: '900',
    paddingHorizontal: 22, letterSpacing: 0.2, marginBottom: 10,
  },

  /* Icon strip */
  iconCard: {
    width: 125, paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 16, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  iconCardText: { marginTop: 8, fontSize: 12, fontWeight: '800', color: '#6E6E6E', textAlign: 'center' },

  list: { paddingHorizontal: 22, gap: 6 },
  listItem: {
    borderRadius: ROW_RADIUS, backgroundColor: colors.white,
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
  },
  listTitle: { fontWeight: '800', fontSize: 14, color: colors.text },
  listMeta: { color: '#6E6E6E', marginTop: 2, fontSize: 12 },

  iconBubble: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: '#e9e8e6ff',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.accent,
  },
  bigIconBubble: {
    width: 54, height: 54, borderRadius: 27, backgroundColor: '#e9e8e6ff',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.accent,
  },

  row: {
    minHeight: 62, borderRadius: ROW_RADIUS, borderWidth: 1.5, backgroundColor: 'transparent',
    paddingHorizontal: 16, marginBottom: 14, flexDirection: 'row', alignItems: 'center',
  },
  cellLeft: { fontWeight: '800', color: '#6E6E6E' },
  goalMeta: { marginTop: 2, color: '#8A8A8A', fontSize: 11, fontWeight: '600' },
  cellRight: { fontWeight: '900', color: colors.blue, textAlign: 'right', fontSize: 14 },

  /* Shadows */
  cardShadow: {
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 1, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  listShadow: {
    shadowColor: '#000',
    shadowOpacity: Platform.select({ ios: 0.12, android: 0.15 }),
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },

  /* Blob */
  blob: {
    position: 'absolute',
    left: -width * 0.10,
    top: -30,
    width: width * 0.6,
    height: width * 0.6,
    borderBottomRightRadius: width,
    backgroundColor: colors.blue,
    alignSelf: 'flex-start',
  },
});

/* ---------- Modal styles ---------- */
const m = StyleSheet.create({
  overlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  card: {
    position: 'absolute', left: 16, right: 16, bottom: 20,
    borderRadius: 16, backgroundColor: '#fff', padding: 14,
  },
  title: { fontWeight: '900', fontSize: 18, marginTop: 8, color: colors.text, textAlign: 'center' },
  subtitle: { fontWeight: '700', fontSize: 12, color: '#6E6E6E', marginTop: 2, textAlign: 'center' },

  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingVertical: 4 },
  label: { flex: 0.9, color: '#6E6E6E', fontWeight: '800' },
  value: { flex: 1.1, color: colors.text, fontWeight: '700', textAlign: 'right' },

  block: { marginTop: 10, backgroundColor: '#F8F8F8', borderRadius: 12, padding: 10 },
  blockLabel: { color: '#6E6E6E', fontWeight: '900', marginBottom: 4, fontSize: 12 },
  blockText: { color: colors.text, fontWeight: '600' },

  redeemBtn: {
    marginTop: 14, backgroundColor: colors.white, borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center', paddingVertical: 12,
  },
  redeemText: { color: colors.accent, fontWeight: '900' },

  cancelBtn: { marginTop: 8, backgroundColor: '#F2F2F2', borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  cancelText: { color: '#6E6E6E', fontWeight: '900' },
});
