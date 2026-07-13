// src/App.jsx — שורש: מצב משותף, localStorage, הכנסה+תקציבים, למידת חוקים, תקופה משותפת

import { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Uploader from "./components/Uploader";
import Transactions from "./components/Transactions";
import Budgets from "./components/Budgets";
import Reports from "./components/Reports";
import Insights from "./components/Insights";
import Settings from "./components/Settings";
import { store, monthOf } from "./constants/theme";
import { defaultPeriod } from "./utils/period";

const TX_KEY = "yjf-transactions";
const RULES_KEY = "yjf-rules";
const INCOME_KEY = "yjf-income";
const BUDGETS_KEY = "yjf-budgets";

export default function App() {
  const [view, setView] = useState("dashboard");
  const [transactions, setTransactions] = useState(() => store.load(TX_KEY, []));
  const [customRules, setCustomRules] = useState(() => store.load(RULES_KEY, []));
  const [income, setIncome] = useState(() => store.load(INCOME_KEY, 0));
  const [budgets, setBudgets] = useState(() => store.load(BUDGETS_KEY, {}));
  const [period, setPeriod] = useState(() => defaultPeriod(store.load(TX_KEY, [])));
  const [pendingCategoryFilter, setPendingCategoryFilter] = useState(null);

  useEffect(() => { store.save(TX_KEY, transactions); }, [transactions]);
  useEffect(() => { store.save(RULES_KEY, customRules); }, [customRules]);
  useEffect(() => { store.save(INCOME_KEY, income); }, [income]);
  useEffect(() => { store.save(BUDGETS_KEY, budgets); }, [budgets]);

  const months = useMemo(
    () => [...new Set(transactions.map(t => monthOf(t.date)))].filter(Boolean).sort().reverse(),
    [transactions]
  );

  // ברירת מחדל: החודש האחרון שיובא, פעם ראשונה בלבד שיש נתונים
  useEffect(() => {
    if (!period.anchorMonth && months.length) {
      setPeriod(p => ({ ...p, anchorMonth: months[0] }));
    }
  }, [months]); // eslint-disable-line

  const cardTotals = useMemo(() => {
    const m = {};
    for (const t of transactions) m[t.card] = (m[t.card] || 0) + t.amount;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  const handleImported = useCallback((fresh) => {
    setTransactions(prev => [...prev, ...fresh].sort((a, b) => (a.date < b.date ? 1 : -1)));
    setView("dashboard");
  }, []);

  const handleCategoryChange = useCallback((id, category, merchant) => {
    setTransactions(prev => prev.map(t => (t.id === id ? { ...t, category } : t)));
    if (merchant) setCustomRules(prev => [[merchant, category], ...prev.filter(([p]) => p !== merchant)]);
  }, []);

  const handleDelete = useCallback((id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const handleSaveSettings = useCallback((inc) => {
    setIncome(inc);
    setView("dashboard");
  }, []);

  const handleSaveBudgets = useCallback((buds) => {
    setBudgets(buds);
  }, []);

  const handleNavigate = useCallback((next) => {
    setPendingCategoryFilter(null);
    setView(next);
  }, []);

  const handleCategorySelect = useCallback((category) => {
    setPendingCategoryFilter(category);
    setView("transactions");
  }, []);

  return (
    <Layout
      active={view}
      onNavigate={handleNavigate}
      onImportClick={() => handleNavigate("upload")}
      cardTotals={cardTotals}
      period={period}
      onPeriodChange={setPeriod}
      transactions={transactions}
    >
      {view === "dashboard" && (
        <Dashboard transactions={transactions} period={period}
          income={income} budgets={budgets}
          onGoSettings={() => handleNavigate("settings")}
          onCategorySelect={handleCategorySelect} />
      )}
      {view === "upload" && (
        <Uploader existingTransactions={transactions} customRules={customRules} onImported={handleImported} />
      )}
      {view === "transactions" && (
        <Transactions transactions={transactions} months={months} initialCategory={pendingCategoryFilter}
          onCategoryChange={handleCategoryChange} onDelete={handleDelete} />
      )}
      {view === "budgets" && (
        <Budgets budgets={budgets} transactions={transactions} period={period} onSave={handleSaveBudgets} />
      )}
      {view === "reports" && (
        <Reports transactions={transactions} />
      )}
      {view === "insights" && (
        <Insights transactions={transactions} period={period} onPeriodChange={setPeriod}
          budgets={budgets} income={income} />
      )}
      {view === "settings" && (
        <Settings
          income={income}
          budgets={budgets}
          transactions={transactions}
          customRules={customRules}
          onSave={handleSaveSettings}
          onRestore={({ transactions: restoredTransactions, customRules: restoredRules, income: restoredIncome, budgets: restoredBudgets }) => {
            setTransactions(Array.isArray(restoredTransactions) ? restoredTransactions : []);
            setCustomRules(Array.isArray(restoredRules) ? restoredRules : []);
            setIncome(Number(restoredIncome) || 0);
            setBudgets(restoredBudgets && typeof restoredBudgets === "object" ? restoredBudgets : {});
          }}
        />
      )}
    </Layout>
  );
}
