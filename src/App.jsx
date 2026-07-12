// src/App.jsx — שורש האפליקציה: מצב משותף, שמירה ב-localStorage, למידת חוקי סיווג

import { useState, useEffect, useMemo, useCallback } from "react";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import Uploader from "./components/Uploader";
import Transactions from "./components/Transactions";
import { store, monthOf } from "./constants/theme";

const TX_KEY = "yjf-transactions";
const RULES_KEY = "yjf-rules";

export default function App() {
  const [view, setView] = useState("dashboard");
  const [transactions, setTransactions] = useState(() => store.load(TX_KEY, []));
  const [customRules, setCustomRules] = useState(() => store.load(RULES_KEY, []));
  const [month, setMonth] = useState("all");

  // שמירה אוטומטית בכל שינוי
  useEffect(() => { store.save(TX_KEY, transactions); }, [transactions]);
  useEffect(() => { store.save(RULES_KEY, customRules); }, [customRules]);

  const months = useMemo(
    () => [...new Set(transactions.map(t => monthOf(t.date)))].filter(Boolean).sort().reverse(),
    [transactions]
  );

  const handleImported = useCallback((fresh) => {
    setTransactions(prev =>
      [...prev, ...fresh].sort((a, b) => (a.date < b.date ? 1 : -1))
    );
    setView("dashboard");
  }, []);

  // עדכון קטגוריה + למידת חוק חדש לאותו בית עסק
  const handleCategoryChange = useCallback((id, category, merchant) => {
    setTransactions(prev => prev.map(t => (t.id === id ? { ...t, category } : t)));
    if (merchant) {
      setCustomRules(prev => [
        [merchant, category],
        ...prev.filter(([p]) => p !== merchant),
      ]);
    }
  }, []);

  const handleDelete = useCallback((id) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <Layout active={view} onNavigate={setView} onImportClick={() => setView("upload")}>
      {view === "dashboard" && (
        <Dashboard
          transactions={transactions}
          month={month}
          onMonthChange={setMonth}
          months={months}
        />
      )}
      {view === "upload" && (
        <Uploader
          existingTransactions={transactions}
          customRules={customRules}
          onImported={handleImported}
        />
      )}
      {view === "transactions" && (
        <Transactions
          transactions={transactions}
          months={months}
          onCategoryChange={handleCategoryChange}
          onDelete={handleDelete}
        />
      )}
    </Layout>
  );
}
