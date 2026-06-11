import { supabase } from './supabase.js';

async function getUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ── Rule engine ────────────────────────────────────────────────────────────
// All messages in French. Returns { healthScore, insights, actions, potentialMonthlySavings }

export function analyzeMonth(entries, currentSnapshot, previousSnapshot, subscriptions) {
  const insights = [];
  const actions = [];

  const income = Number(currentSnapshot?.total_income || 0);
  const expenses = Number(currentSnapshot?.total_expenses || 0);
  const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;
  const prevSavingsRate = previousSnapshot && Number(previousSnapshot.total_income) > 0
    ? ((Number(previousSnapshot.total_income) - Number(previousSnapshot.total_expenses)) / Number(previousSnapshot.total_income)) * 100
    : null;

  const breakdown = {};
  for (const e of entries.filter(e => e.direction === 'expense')) {
    breakdown[e.category] = (breakdown[e.category] || 0) + Number(e.amount);
  }
  const prevBreakdown = previousSnapshot?.breakdown || {};

  // Rule 1 — spending increase by category (>15% vs last month)
  for (const [cat, amount] of Object.entries(breakdown)) {
    const prev = Number(prevBreakdown[cat] || 0);
    if (prev > 0) {
      const delta = ((amount - prev) / prev) * 100;
      if (delta > 15) {
        const label = _catLabel(cat);
        if (delta > 30) {
          insights.push({ type: 'alert', category: cat, message: `Les dépenses ${label} ont augmenté de ${Math.round(delta)}% ce mois (${_fmt(amount)} vs ${_fmt(prev)}).`, delta: Math.round(delta) });
        } else {
          insights.push({ type: 'warning', category: cat, message: `Les dépenses ${label} ont augmenté de ${Math.round(delta)}% ce mois (${_fmt(amount)} vs ${_fmt(prev)}).`, delta: Math.round(delta) });
        }
        const potential = Math.round(amount - prev);
        if (potential > 0) actions.push({ priority: delta > 30 ? 'high' : 'medium', message: `Réduire les dépenses ${label} au niveau du mois précédent`, potential_savings: potential });
      } else if (delta < -10) {
        insights.push({ type: 'positive', category: cat, message: `Bravo ! Les dépenses ${_catLabel(cat)} ont baissé de ${Math.round(Math.abs(delta))}% ce mois.`, delta: Math.round(delta) });
      }
    }
  }

  // Rule 2 — savings rate monitoring
  if (savingsRate < 10) {
    insights.push({ type: 'alert', category: 'savings', message: `Votre taux d'épargne est de ${Math.round(savingsRate)}% — en dessous du seuil critique de 10%.`, delta: Math.round(savingsRate) });
    actions.push({ priority: 'high', message: 'Identifier et réduire les dépenses non essentielles immédiatement', potential_savings: Math.round(expenses * 0.1) });
  } else if (savingsRate < 20) {
    insights.push({ type: 'warning', category: 'savings', message: `Votre taux d'épargne est de ${Math.round(savingsRate)}% — en dessous de l'objectif recommandé de 20%.`, delta: Math.round(savingsRate) });
    actions.push({ priority: 'medium', message: `Augmenter le taux d'épargne jusqu'à 20% en réduisant les dépenses discrétionnaires`, potential_savings: Math.round(income * 0.2 - (income - expenses)) });
  }

  if (prevSavingsRate !== null) {
    const rateDelta = savingsRate - prevSavingsRate;
    if (rateDelta < -5) {
      insights.push({ type: 'warning', category: 'savings', message: `Votre taux d'épargne est passé de ${Math.round(prevSavingsRate)}% à ${Math.round(savingsRate)}% (${Math.round(rateDelta)}%).`, delta: Math.round(rateDelta) });
    }
  }

  // Rule 3 — subscription analysis (>5% of income)
  const totalSubCost = subscriptions ? subscriptions.reduce((s, sub) => {
    if (!sub.amount) return s;
    let monthly = Number(sub.amount);
    if (sub.renewal === 'yearly') monthly = monthly / 12;
    return s + monthly;
  }, 0) : 0;
  if (income > 0 && totalSubCost > income * 0.05) {
    const pct = Math.round((totalSubCost / income) * 100);
    insights.push({ type: 'warning', category: 'subscriptions', message: `Vos abonnements représentent ${pct}% de vos revenus (${_fmt(totalSubCost)}/mois) — supérieur au seuil recommandé de 5%.`, delta: pct });
    const potential = Math.round(totalSubCost - income * 0.05);
    actions.push({ priority: 'medium', message: `Revoir et résilier les abonnements sous-utilisés`, potential_savings: potential });
  }

  // Rule 4 — category benchmarks
  if (income > 0) {
    if (breakdown.housing && breakdown.housing / income > 0.35) {
      const pct = Math.round((breakdown.housing / income) * 100);
      insights.push({ type: 'warning', category: 'housing', message: `Le logement représente ${pct}% de vos revenus (recommandé : max 35%).`, delta: pct });
    }
    if (breakdown.food && breakdown.food / income > 0.20) {
      const pct = Math.round((breakdown.food / income) * 100);
      insights.push({ type: 'warning', category: 'food', message: `L'alimentation représente ${pct}% de vos revenus (recommandé : max 20%).`, delta: pct });
      actions.push({ priority: 'medium', message: 'Préparer plus de repas maison pour réduire les dépenses alimentaires', potential_savings: Math.round(breakdown.food - income * 0.20) });
    }
  }

  // Rule 5 — emergency fund progress
  const monthlyExpenses = expenses;
  if (monthlyExpenses > 0 && income > expenses) {
    const monthlySavings = income - expenses;
    const target = monthlyExpenses * 3;
    const monthsToTarget = Math.ceil(target / monthlySavings);
    if (monthsToTarget <= 24) {
      insights.push({ type: 'tip', category: 'savings', message: `À votre rythme d'épargne actuel, vous atteindrez 3 mois de réserve dans ${monthsToTarget} mois.`, delta: monthsToTarget });
    }
  }

  // Sort insights: alerts first, warnings, tips, positives
  const ORDER = { alert: 0, warning: 1, tip: 2, positive: 3 };
  insights.sort((a, b) => (ORDER[a.type] ?? 4) - (ORDER[b.type] ?? 4));

  // Sort actions by potential savings desc
  actions.sort((a, b) => b.potential_savings - a.potential_savings);

  const potentialMonthlySavings = actions.reduce((s, a) => s + (a.potential_savings || 0), 0);

  // Rule 6 — health score (weighted composite)
  const savingsScore  = Math.min(100, Math.max(0, savingsRate >= 20 ? 100 : savingsRate >= 10 ? 50 + (savingsRate - 10) * 5 : savingsRate * 5));
  const stabilityScore = previousSnapshot ? Math.max(0, 100 - Math.abs(Number(currentSnapshot.total_expenses) - Number(previousSnapshot.total_expenses)) / Math.max(1, Number(previousSnapshot.total_expenses)) * 100) : 60;
  const subScore = income > 0 ? Math.max(0, 100 - Math.max(0, (totalSubCost / income * 100) - 5) * 4) : 70;
  const progressScore = income > expenses ? 80 : 20;
  const healthScore = Math.round(savingsScore * 0.4 + stabilityScore * 0.2 + subScore * 0.2 + progressScore * 0.2);

  return { healthScore, insights, actions, potentialMonthlySavings };
}

function _catLabel(cat) {
  const labels = {
    salary: 'salaire', scholarship: 'bourse', freelance: 'freelance', dividends: 'dividendes', other_income: 'autres revenus',
    housing: 'logement', transport: 'transport', food: 'alimentation', leisure: 'loisirs',
    education: 'éducation', health: 'santé', subscriptions: 'abonnements', other_expense: 'autres dépenses'
  };
  return labels[cat] || cat;
}

function _fmt(n) {
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' CHF';
}

// ── Persistence ────────────────────────────────────────────────────────────

export async function saveAdvice(month, year, analysis) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('financial_advice_logs')
    .upsert({
      user_id, month, year,
      health_score: analysis.healthScore,
      insights: analysis.insights,
      actions: analysis.actions,
    }, { onConflict: 'user_id,month,year' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function loadAdvice(month, year) {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('financial_advice_logs')
    .select('*')
    .eq('user_id', user_id)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function loadAdviceHistory() {
  const user_id = await getUserId();
  const { data, error } = await supabase
    .from('financial_advice_logs')
    .select('month, year, health_score, created_at')
    .eq('user_id', user_id)
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  if (error) throw error;
  return data || [];
}
