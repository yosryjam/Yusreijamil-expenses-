// src/App.jsx — שורש: מצב משותף, localStorage, הכנסה+תקציבים, למידת חוקים

import { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Uploader from "./components/Uploader";
import Transactions from "./components/Transactions";
import Settings from "./components/Settings";
import { store, monthOf } from "./constants/theme";

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
  const [month, setMonth] = useState("all");

  useEffect(() => { store.save(TX_KEY, transactions); }, [transactions]);
  useEffect(() => { store.save(RULES_KEY, customRules); }, [customRules]);
  useEffect(() => { store.save(INCOME_KEY, income); }, [income]);
  useEffect(() => { store.save(BUDGETS_KEY, budgets); }, [budgets]);

  const months = useMemo(
    () => [...new Set(transactions.map(t => monthOf(t.date)))].filter(Boolean).sort().reverse(),
    [transactions]
  );

  // ברירת מחדל: החודש האחרון שיובא (כדי שהטבעת והתקציב יהיו חודשיים)
  useEffect(() => {
    if (month === "all" && months.length) setMonth(months[0]);
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

  const handleSaveSettings = useCallback((inc, buds) => {
    setIncome(inc);
    setBudgets(buds);
    setView("dashboard");
  }, []);

  return (
    <Layout
      active={view}
      onNavigate={setView}
      onImportClick={() => setView("upload")}
      cardTotals={cardTotals}
      month={month}
      months={months}
      onMonthChange={setMonth}
    >
      {view === "dashboard" && (
        <Dashboard transactions={transactions} month={month}
          income={income} budgets={budgets} onGoSettings={() => setView("settings")} />
      )}
      {view === "upload" && (
        <Uploader existingTransactions={transactions} customRules={customRules} onImported={handleImported} />
      )}
      {view === "transactions" && (
        <Transactions transactions={transactions} months={months}
          onCategoryChange={handleCategoryChange} onDelete={handleDelete} />
      )}
      {view === "settings" && (
        <Settings income={income} budgets={budgets} onSave={handleSaveSettings} />
      )}
    </Layout>
  );
}
