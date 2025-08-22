// services/rewards.ts
import { Timestamp, doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';

// ----- Types used here (kept local to this service) -----
type RewardType = 'bath' | 'treats' | 'toy' | 'vet' | 'grooming' | 'kibble' | 'other';

type CatalogItem = {
  id: string;                    // stable id
  icon: string;                  // Ionicons name
  // what the user sees in the strip:
  chipText: string;              // e.g. "Park x3 (this week)"
  // the actual task:
  taskTitle: string;             // e.g. "Take your pet to the park"
  taskTarget: number;            // e.g. 3
  period: 'week' | 'month';      // only used for copy
  // the reward you get for finishing this task:
  reward: {
    title: string;
    sponsor: string;
    type: RewardType;
    description?: string;
    terms?: string;
    extraExpiryDays?: number;    // from end of month (default 14)
  };
};

// ----- A small catalog to pick from each month -----
const CATALOG: CatalogItem[] = [
  {
    id: 'park-3x',
    icon: 'tennisball',
    chipText: 'Park x3 (this week)',
    taskTitle: 'Take your pet to the park',
    taskTarget: 3,
    period: 'week',
    reward: {
      title: 'Bath Voucher',
      sponsor: 'FurrySpa',
      type: 'bath',
      description: 'One complimentary bath session for your pet.',
      terms: 'Appointment required. Not valid with other offers.',
      extraExpiryDays: 14,
    },
  },
  {
    id: 'am-walk-5x',
    icon: 'walk',
    chipText: 'Morning walk x5',
    taskTitle: 'Complete a morning walk',
    taskTarget: 5,
    period: 'month',
    reward: {
      title: '10% Off Treats',
      sponsor: 'PawCo',
      type: 'treats',
      description: 'Enjoy 10% off any treats at participating stores.',
      terms: 'Valid once per user.',
    },
  },
  {
    id: 'training-2x',
    icon: 'school',
    chipText: 'Training x2',
    taskTitle: 'Do a short training session',
    taskTarget: 2,
    period: 'month',
    reward: {
      title: 'Free Toy',
      sponsor: 'WoofBox',
      type: 'toy',
      description: 'Redeem a free small toy at WoofBox.',
      terms: 'Limited to stock on hand.',
    },
  },
  {
    id: 'groom-1x',
    icon: 'cut',
    chipText: 'Groom once',
    taskTitle: 'Log a grooming activity',
    taskTarget: 1,
    period: 'month',
    reward: {
      title: 'Grooming Discount',
      sponsor: 'ShinyPaws',
      type: 'grooming',
    },
  },
  {
    id: 'vet-1x',
    icon: 'medkit',
    chipText: 'Health check',
    taskTitle: 'Complete one health check reminder',
    taskTarget: 1,
    period: 'month',
    reward: {
      title: 'Vet Check Voucher',
      sponsor: 'HealthyPets',
      type: 'vet',
    },
  },
  {
    id: 'kibble-steps',
    icon: 'nutrition',
    chipText: 'Active week',
    taskTitle: 'Log 5 activities this month',
    taskTarget: 5,
    period: 'month',
    reward: {
      title: 'Premium Kibble Pack',
      sponsor: 'GoodGrain',
      type: 'kibble',
    },
  },
];

// ----- helpers -----
export const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

const endOfMonth = (d = new Date()) => {
  const x = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  x.setHours(23, 59, 59, 999);
  return x;
};

function pickRandom<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/**
 * Ensure this user has a monthly pack (3 random challenges) generated for YYYY-MM.
 * Creates:
 * - users/{uid}/rewardMonths/{YYYY-MM}
 * - users/{uid}/rewardTasks/task-{catalogId}-{YYYY-MM}
 * - users/{uid}/rewardGoals/goal-{catalogId}-{YYYY-MM} (linked to task via taskId)
 */
export async function ensureMonthlyPack(uid: string) {
  const key = monthKey();
  const monthRef = doc(db, 'users', uid, 'rewardMonths', key);
  const monthSnap = await getDoc(monthRef);
  if (monthSnap.exists()) return key;

  const chosen = pickRandom(CATALOG, 3);
  const eom = endOfMonth();
  const expiresBase = Timestamp.fromDate(
    new Date(eom.getTime() + 1000 * 60 * 60 * 24 *  (chosen[0]?.reward.extraExpiryDays ?? 14))
  );

  // create tasks + goals
  for (const c of chosen) {
    const taskId = `task-${c.id}-${key}`;
    const goalId = `goal-${c.id}-${key}`;

    await setDoc(
      doc(db, 'users', uid, 'rewardTasks', taskId),
      {
        id: taskId,
        title: c.taskTitle,
        icon: c.icon,
        target: c.taskTarget,
        count: 0,
        month: key,
        challengeId: c.id,
        period: c.period, // for UI copy if you want
      },
      { merge: true }
    );

    await setDoc(
      doc(db, 'users', uid, 'rewardGoals', goalId),
      {
        id: goalId,
        title: c.reward.title,
        requiredActivity: c.chipText,
        progressPct: 0,
        taskId,
        sponsor: c.reward.sponsor,
        type: c.reward.type,
        description: c.reward.description ?? '',
        terms: c.reward.terms ?? '',
        month: key,
        // give a grace period beyond month end
        expiresAt: expiresBase,
      },
      { merge: true }
    );
  }

  await setDoc(
    monthRef,
    {
      createdAt: Timestamp.now(),
      challengeIds: chosen.map((c) => c.id),
      count: chosen.length,
    },
    { merge: true }
  );

  return key;
}
