import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError, api, Loan, Summary } from './api';

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function Card({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[s.card, { borderTopColor: color }]}>
      <Text style={s.cardLabel}>{label}</Text>
      <Text style={[s.cardValue, { color }]}>{money(value)}</Text>
    </View>
  );
}

export default function LoansScreen({ onLogout }: { onLogout: () => Promise<void> }) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary>({ totalLent: 0, totalRepaid: 0, overdueAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [repaying, setRepaying] = useState<number | null>(null);
  const [friend, setFriend] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.getLoans();
      setLoans(data.loans);
      setSummary(data.summary);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        Alert.alert('Session expired', 'Please log in again.');
        await onLogout();
      } else {
        Alert.alert('Error', (e as Error).message);
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async () => {
    const parsedAmount = Number(amount);
    if (!friend.trim()) {
      Alert.alert('Could not add loan', "Enter your friend's name.");
      return;
    }
    if (
      !Number.isFinite(parsedAmount) ||
      parsedAmount <= 0 ||
      parsedAmount > 1_000_000_000 ||
      !/^\d+(?:\.\d{1,2})?$/.test(parsedAmount.toString())
    ) {
      Alert.alert('Could not add loan', 'Enter an amount greater than zero with at most 2 decimal places.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate.trim())) {
      Alert.alert('Could not add loan', 'Enter the due date in YYYY-MM-DD format.');
      return;
    }
    const [year, month, day] = dueDate.trim().split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      Alert.alert('Could not add loan', 'Enter a valid calendar date.');
      return;
    }

    setAdding(true);
    try {
      await api.addLoan(friend.trim(), parsedAmount, dueDate.trim());
      setFriend(''); setAmount(''); setDueDate('');
      await load();
    } catch (e) {
      Alert.alert('Could not add loan', (e as Error).message);
    } finally {
      setAdding(false);
    }
  };

  const repay = async (id: number) => {
    setRepaying(id);
    try {
      await api.repay(id);
      await load();
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setRepaying(null);
    }
  };

  const header = (
    <View>
      <View style={s.row}>
        <Card label="Total Lent" value={summary.totalLent} color="#2563eb" />
        <Card label="Total Repaid" value={summary.totalRepaid} color="#16a34a" />
        <Card label="Overdue" value={summary.overdueAmount} color="#dc2626" />
      </View>
      <View style={s.form}>
        <Text style={s.h}>Add loan</Text>
        <TextInput style={s.input} placeholder="Friend's name" value={friend} onChangeText={setFriend} />
        <TextInput style={s.input} placeholder="Amount (₹)" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        <TextInput style={s.input} placeholder="Due date (YYYY-MM-DD)" value={dueDate} onChangeText={setDueDate} autoCapitalize="none" />
        <Button title={adding ? 'Adding...' : 'Add Loan'} onPress={add} disabled={adding} />
      </View>
      <Text style={[s.h, { marginHorizontal: 16 }]}>Your loans</Text>
    </View>
  );

  return (
    <FlatList
      data={loans}
      keyExtractor={(l) => String(l.id)}
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={s.empty}>{loading ? 'Loading loans...' : 'No loans yet.'}</Text>}
      ListFooterComponent={<View style={{ margin: 16 }}><Button title="Log out" color="#666" onPress={onLogout} /></View>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      renderItem={({ item }) => (
        <View style={[s.loan, item.overdue && s.overdue, item.status === 'repaid' && s.repaid]}>
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{item.friendName}</Text>
            <Text>{money(item.amount)} · due {item.dueDate}</Text>
            <Text style={{ fontWeight: '700', color: item.status === 'repaid' ? '#16a34a' : item.overdue ? '#dc2626' : '#92400e' }}>
              {item.status === 'repaid' ? 'REPAID' : item.overdue ? 'OVERDUE' : 'PENDING'}
            </Text>
          </View>
          {item.status === 'pending' && (
            <Button
              title={repaying === item.id ? 'Updating...' : 'Mark as Repaid'}
              onPress={() => repay(item.id)}
              disabled={repaying !== null}
            />
          )}
        </View>
      )}
    />
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', padding: 12, gap: 8 },
  card: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10, borderTopWidth: 4 },
  cardLabel: { fontSize: 12, color: '#666' },
  cardValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  form: { backgroundColor: '#fff', margin: 12, padding: 12, borderRadius: 8 },
  h: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8 },
  loan: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 4, padding: 12, borderRadius: 8, borderLeftWidth: 5, borderLeftColor: '#f59e0b' },
  overdue: { backgroundColor: '#fee2e2', borderLeftColor: '#dc2626' },
  repaid: { backgroundColor: '#dcfce7', borderLeftColor: '#16a34a' },
  name: { fontSize: 16, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#888', margin: 20 },
});
