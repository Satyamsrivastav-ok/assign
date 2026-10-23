import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { ApiError, api, Loan, Summary } from './api';

const money = (n: number) => `₹${n.toLocaleString('en-IN')}`;

function Card({ label, value, tone, note }: { label: string; value: number; tone: 'coral' | 'blue' | 'rose'; note: string }) {
  return (
    <View style={[s.summaryCard, s[`summary_${tone}`]]}>
      <View style={s.summaryTop}>
        <Text style={s.summaryLabel}>{label}</Text>
        <View style={s.summaryDot}><Text style={s.summaryDotText}>···</Text></View>
      </View>
      <Text numberOfLines={1} adjustsFontSizeToFit style={s.summaryValue}>{money(value)}</Text>
      <Text style={s.summaryNote}>{note}</Text>
      <View style={s.summaryWave}>
        <View style={[s.waveLine, s.waveOne]} />
        <View style={[s.waveLine, s.waveTwo]} />
        <View style={[s.waveLine, s.waveThree]} />
      </View>
    </View>
  );
}

export default function LoansScreen({ onLogout }: { onLogout: () => Promise<void> }) {
  const { width } = useWindowDimensions();
  const compact = width < 720;
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
        Alert.alert('Error', e instanceof Error ? e.message : 'Could not load your loans.');
      }
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [onLogout]);

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
      setFriend('');
      setAmount('');
      setDueDate('');
      await load();
    } catch (e) {
      Alert.alert('Could not add loan', e instanceof Error ? e.message : 'The loan could not be saved.');
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
      Alert.alert('Could not update loan', e instanceof Error ? e.message : 'The repayment could not be saved.');
    } finally {
      setRepaying(null);
    }
  };

  const header = (
    <View style={s.contentHeader}>
      <View style={s.pageHeading}>
        <View>
          <Text style={s.kicker}>PERSONAL FINANCE</Text>
          <Text style={s.pageTitle}>Your ledger</Text>
          <Text style={s.pageSubtitle}>A clear view of the money you share with friends.</Text>
        </View>
        <View style={s.headerActions}>
          <Pressable accessibilityRole="button" onPress={load} style={s.refreshButton}>
            <Text style={s.refreshButtonText}>↻</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onLogout} style={s.logoutButton}>
            <Text style={s.logoutText}>Log out</Text>
          </Pressable>
        </View>
      </View>
      <View style={s.summaryRow}>
        <Card label="Total lent" value={summary.totalLent} tone="coral" note="Across all your loans" />
        <Card label="Total repaid" value={summary.totalRepaid} tone="blue" note="Paid back in full" />
        <Card label="Overdue" value={summary.overdueAmount} tone="rose" note="Outstanding past due" />
      </View>
      <View style={s.sectionHeading}>
        <View>
          <Text style={s.sectionTitle}>Add a loan</Text>
          <Text style={s.sectionHint}>Record a new amount you’ve lent.</Text>
        </View>
        <View style={s.sectionBadge}><Text style={s.sectionBadgeText}>NEW ENTRY</Text></View>
      </View>
      <View style={[s.form, compact && s.formCompact]}>
        <View style={[s.field, compact && s.fieldCompact]}>
          <Text style={s.fieldLabel}>FRIEND</Text>
          <TextInput style={s.input} placeholder="Name" placeholderTextColor="#9a9da5" value={friend} onChangeText={setFriend} returnKeyType="next" />
        </View>
        <View style={[s.field, compact && s.fieldCompact]}>
          <Text style={s.fieldLabel}>AMOUNT</Text>
          <TextInput style={s.input} placeholder="₹ 0.00" placeholderTextColor="#9a9da5" keyboardType="decimal-pad" value={amount} onChangeText={setAmount} />
        </View>
        <View style={[s.field, compact && s.fieldCompact]}>
          <Text style={s.fieldLabel}>DUE DATE</Text>
          <TextInput style={s.input} placeholder="YYYY-MM-DD" placeholderTextColor="#9a9da5" value={dueDate} onChangeText={setDueDate} autoCapitalize="none" />
        </View>
        <Pressable accessibilityRole="button" style={({ pressed }) => [s.addButton, pressed && s.buttonPressed, adding && s.buttonDisabled]} onPress={add} disabled={adding}>
          {adding ? <ActivityIndicator color="#fff" /> : <Text style={s.addButtonText}>＋  Add loan</Text>}
        </Pressable>
      </View>
      <View style={s.listHeading}>
        <View>
          <Text style={s.sectionTitle}>Recent activity</Text>
          <Text style={s.sectionHint}>Your loans, sorted by due date.</Text>
        </View>
        <View style={s.countBadge}><Text style={s.countText}>{loans.length} {loans.length === 1 ? 'LOAN' : 'LOANS'}</Text></View>
      </View>
      <View style={s.listColumnHeading}>
        <Text style={[s.columnLabel, { flex: 1.6 }]}>FRIEND</Text>
        <Text style={[s.columnLabel, { flex: 1 }]}>DUE DATE</Text>
        <Text style={[s.columnLabel, { flex: 0.85 }]}>STATUS</Text>
        {!compact && <Text style={[s.columnLabel, { width: 130, textAlign: 'right' }]}>AMOUNT</Text>}
      </View>
    </View>
  );

  return (
    <View style={s.dashboard}>
      <View style={s.sidebar}>
        <View style={s.sidebarBrand}><Text style={s.sidebarBrandText}>m</Text></View>
        <View style={s.sidebarNav}>
          <View style={s.activeNav}><Text style={s.navIcon}>▦</Text></View>
          <View style={s.navItem}><Text style={s.navIcon}>◷</Text></View>
          <View style={s.navItem}><Text style={s.navIcon}>◉</Text></View>
          <View style={s.navItem}><Text style={s.navIcon}>⌕</Text></View>
        </View>
        <Pressable accessibilityRole="button" onPress={onLogout} style={s.sidebarLogout}><Text style={s.navIcon}>↪</Text></Pressable>
      </View>
      <View style={s.main}>
        <FlatList
          data={loans}
          keyExtractor={(l) => String(l.id)}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={s.empty}>
              <View style={s.emptyIcon}><Text style={s.emptyIconText}>₹</Text></View>
              <Text style={s.emptyTitle}>{loading ? 'Loading your ledger…' : 'Your ledger starts here'}</Text>
              <Text style={s.emptyText}>{loading ? 'Getting your latest loans and totals.' : 'Add a loan above and it will show up here.'}</Text>
            </View>
          }
          ListFooterComponent={<View style={s.listFooter} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} tintColor="#f4775f" />}
          contentContainerStyle={s.listContent}
          renderItem={({ item }) => {
            const status = item.status === 'repaid' ? 'REPAID' : item.overdue ? 'OVERDUE' : 'PENDING';
            const statusStyle = item.status === 'repaid' ? s.statusRepaid : item.overdue ? s.statusOverdue : s.statusPending;
            return (
              <View style={[s.loanRow, item.overdue && s.loanRowOverdue]}>
                <View style={[s.avatar, item.overdue && s.avatarOverdue, item.status === 'repaid' && s.avatarRepaid]}>
                  <Text style={[s.avatarText, item.status === 'repaid' && s.avatarTextRepaid]}>{item.friendName.trim().charAt(0).toUpperCase()}</Text>
                </View>
                <View style={s.friendColumn}>
                  <Text numberOfLines={1} style={s.friendName}>{item.friendName}</Text>
                  {compact && <Text style={s.mobileAmount}>{money(item.amount)}</Text>}
                </View>
                <View style={s.dueColumn}>
                  <Text style={s.dueDate}>{item.dueDate}</Text>
                  {item.overdue && <Text style={s.overdueCaption}>PAST DUE</Text>}
                </View>
                <View style={s.statusColumn}>
                  <View style={[s.statusBadge, statusStyle]}><Text style={[s.statusText, item.status === 'repaid' && s.statusTextRepaid]}>{status}</Text></View>
                </View>
                {!compact && <Text style={s.loanAmount}>{money(item.amount)}</Text>}
                {item.status === 'pending' ? (
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [s.repayButton, pressed && s.buttonPressed, repaying !== null && s.buttonDisabled]}
                    onPress={() => repay(item.id)}
                    disabled={repaying !== null}
                  >
                    <Text style={s.repayText}>{repaying === item.id ? 'Updating…' : 'Mark repaid'}</Text>
                  </Pressable>
                ) : <View style={s.repaidMark}><Text style={s.repaidMarkText}>✓</Text></View>}
              </View>
            );
          }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  dashboard: { flex: 1, minHeight: '100%', flexDirection: 'row', backgroundColor: '#23252d' },
  sidebar: { width: 72, alignItems: 'center', paddingVertical: 18, backgroundColor: '#101421' },
  sidebarBrand: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#f4775f' },
  sidebarBrandText: { color: '#fff', fontSize: 24, lineHeight: 29, fontWeight: '900' },
  sidebarNav: { alignItems: 'center', gap: 13, marginTop: 46 },
  activeNav: { width: 48, height: 42, borderRadius: 14, backgroundColor: '#343849', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#42485b' },
  navItem: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  navIcon: { color: '#bdc3d0', fontSize: 18, fontWeight: '700' },
  sidebarLogout: { marginTop: 'auto', width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  main: { flex: 1, minWidth: 0, minHeight: '100%', maxHeight: '100%', margin: 12, marginLeft: 0, overflow: 'hidden', backgroundColor: '#f3f1ee', borderTopRightRadius: 22, borderBottomRightRadius: 22 },
  listContent: { paddingHorizontal: 24, paddingTop: 23, paddingBottom: 10, maxWidth: 1280, width: '100%', alignSelf: 'center' },
  contentHeader: { width: '100%' },
  pageHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  kicker: { color: '#f4775f', fontSize: 9, fontWeight: '800', letterSpacing: 1.6, marginBottom: 6 },
  pageTitle: { color: '#171923', fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.8 },
  pageSubtitle: { color: '#85858b', fontSize: 12, marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  refreshButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e9e6e2' },
  refreshButtonText: { color: '#4b5260', fontSize: 22, lineHeight: 26 },
  logoutButton: { height: 38, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 13, backgroundColor: '#111522' },
  logoutText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 26 },
  summaryCard: { flex: 1, minWidth: 180, minHeight: 143, borderRadius: 17, padding: 16, overflow: 'hidden', justifyContent: 'space-between' },
  summary_coral: { backgroundColor: '#f4775f' },
  summary_blue: { backgroundColor: '#678df5' },
  summary_rose: { backgroundColor: '#ec5b91' },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '600' },
  summaryDot: { width: 25, height: 20, alignItems: 'center', justifyContent: 'center' },
  summaryDotText: { color: 'rgba(255,255,255,0.9)', fontSize: 18, lineHeight: 17, fontWeight: '800' },
  summaryValue: { color: '#fff', fontSize: 27, fontWeight: '800', letterSpacing: -0.7, marginTop: 8 },
  summaryNote: { color: 'rgba(255,255,255,0.77)', fontSize: 10, marginTop: 2 },
  summaryWave: { position: 'absolute', height: 36, bottom: 8, right: 14, left: 14, opacity: 0.48 },
  waveLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#fff', borderRadius: 2 },
  waveOne: { top: 12, transform: [{ rotate: '-5deg' }] },
  waveTwo: { top: 20, transform: [{ rotate: '4deg' }] },
  waveThree: { top: 28, transform: [{ rotate: '-2deg' }] },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#20222b', fontSize: 16, fontWeight: '800', letterSpacing: -0.3 },
  sectionHint: { color: '#929199', fontSize: 11, marginTop: 4 },
  sectionBadge: { paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#fce5df' },
  sectionBadgeText: { color: '#dd664f', fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  form: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10, backgroundColor: '#fff', padding: 14, marginBottom: 25, borderRadius: 15, borderWidth: 1, borderColor: '#ebe8e4' },
  formCompact: { padding: 12 },
  field: { flex: 1, minWidth: 125 },
  fieldCompact: { minWidth: 145 },
  fieldLabel: { color: '#8a8a92', fontSize: 8, fontWeight: '800', letterSpacing: 0.9, marginBottom: 6 },
  input: { height: 40, borderWidth: 1, borderColor: '#ece9e5', borderRadius: 9, paddingHorizontal: 10, color: '#242632', backgroundColor: '#fbfaf9', fontSize: 12 },
  addButton: { minWidth: 120, height: 40, paddingHorizontal: 15, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111522' },
  addButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  buttonPressed: { opacity: 0.8 },
  buttonDisabled: { opacity: 0.6 },
  listHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  countBadge: { paddingVertical: 6, paddingHorizontal: 9, borderRadius: 8, backgroundColor: '#eae8e4' },
  countText: { color: '#777882', fontSize: 8, fontWeight: '800', letterSpacing: 0.7 },
  listColumnHeading: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 8 },
  columnLabel: { color: '#a3a1a0', fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  loanRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 10, marginBottom: 7, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eeeae6' },
  loanRowOverdue: { backgroundColor: '#fff8f6', borderColor: '#f5d2c9' },
  avatar: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fce5df' },
  avatarOverdue: { backgroundColor: '#ffe3dc' },
  avatarRepaid: { backgroundColor: '#e6f3eb' },
  avatarText: { color: '#e87961', fontSize: 13, fontWeight: '800' },
  avatarTextRepaid: { color: '#38966c' },
  friendColumn: { flex: 1.6, minWidth: 0 },
  friendName: { color: '#262832', fontSize: 12, fontWeight: '700' },
  mobileAmount: { color: '#83838b', fontSize: 10, marginTop: 3 },
  dueColumn: { flex: 1, minWidth: 0 },
  dueDate: { color: '#777781', fontSize: 10 },
  overdueCaption: { color: '#e26b56', fontSize: 7, letterSpacing: 0.6, fontWeight: '800', marginTop: 3 },
  statusColumn: { flex: 0.85, minWidth: 0, alignItems: 'flex-start' },
  statusBadge: { paddingVertical: 5, paddingHorizontal: 7, borderRadius: 7 },
  statusPending: { backgroundColor: '#fff1d8' },
  statusOverdue: { backgroundColor: '#ffe2dc' },
  statusRepaid: { backgroundColor: '#e5f3e9' },
  statusText: { color: '#b87b25', fontSize: 7, fontWeight: '800', letterSpacing: 0.4 },
  statusTextRepaid: { color: '#438b5e' },
  loanAmount: { width: 95, textAlign: 'right', color: '#30313a', fontSize: 11, fontWeight: '700' },
  repayButton: { minWidth: 86, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 9, borderRadius: 8, backgroundColor: '#f1f2f5' },
  repayText: { color: '#323744', fontSize: 9, fontWeight: '700' },
  repaidMark: { width: 25, height: 25, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e6f3eb' },
  repaidMarkText: { color: '#34885e', fontSize: 14, fontWeight: '800' },
  empty: { alignItems: 'center', paddingVertical: 37, paddingHorizontal: 20, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eeeae6' },
  emptyIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fce5df', marginBottom: 11 },
  emptyIconText: { color: '#e87961', fontSize: 22, fontWeight: '800' },
  emptyTitle: { color: '#30313a', fontSize: 13, fontWeight: '800' },
  emptyText: { color: '#8d8c93', fontSize: 11, marginTop: 5, textAlign: 'center' },
  listFooter: { height: 20 },
});
