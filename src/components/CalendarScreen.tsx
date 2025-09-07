import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const isSameYMD = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function useMonthMatrix(year: number, month: number) {
  return useMemo(() => {
    const firstDow = new Date(year, month, 1).getDay(); // 0=일
    const curDays = daysInMonth(year, month);
    const prevDays = daysInMonth(year, month - 1);

    const cells: { date: Date; inMonth: boolean }[] = [];
    for (let i = firstDow - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, prevDays - i), inMonth: false });
    }
    for (let d = 1; d <= curDays; d++) cells.push({ date: new Date(year, month, d), inMonth: true });
    while (cells.length < 42) {
      const next = cells.length - (firstDow + curDays) + 1;
      cells.push({ date: new Date(year, month + 1, next), inMonth: false });
    }
    return cells;
  }, [year, month]);
}

export default function CalendarScreen() {
  const [selected, setSelected] = useState<Date | null>(() => new Date());

  const [cursor, setCursor] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth() };
  });

  useFocusEffect(
    useCallback(() => {
      const t = new Date();
      setCursor({ y: t.getFullYear(), m: t.getMonth() });
      setSelected(new Date());
    }, [])
  );

  const today = new Date();
  const matrix = useMonthMatrix(cursor.y, cursor.m);

  const goPrev = () =>
    setCursor(({ y, m }) => ({ y: y + (m - 1 < 0 ? -1 : 0), m: (m + 11) % 12 }));
  const goNext = () =>
    setCursor(({ y, m }) => ({ y: y + (m + 1 > 11 ? 1 : 0), m: (m + 1) % 12 }));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={goPrev} hitSlop={10}><Text style={styles.nav}>{'‹'}</Text></Pressable>
        <Text style={styles.title}>{cursor.y}년 {cursor.m + 1}월</Text>
        <Pressable onPress={goNext} hitSlop={10}><Text style={styles.nav}>{'›'}</Text></Pressable>
      </View>

      {/* 요일 헤더 */}
      <View style={styles.weekHeader}>
        {WEEK_LABELS.map((w, i) => (
          <View key={w} style={styles.weekCell}>
            <Text style={[
              styles.weekText,
              i === 0 && { color: 'red' },
              i === 6 && { color: 'blue' }
            ]}>{w}</Text>
          </View>
        ))}
      </View>

      {/* 날짜 7열 고정 */}
      <FlatList
        data={matrix}
        keyExtractor={(item) => item.date.toISOString()}
        numColumns={7}
        scrollEnabled={false}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => {
          const dow = index % 7;
          const isToday = isSameYMD(item.date, today);
          const isSelected = selected && isSameYMD(item.date, selected);

          return (
            <Pressable
              style={[
                styles.cell,
                !item.inMonth && styles.outMonthCell,
                isSelected && styles.selectedCell,
              ]}
              onPress={() => setSelected(item.date)}
            >
              <Text style={[
                styles.day,
                !item.inMonth && styles.outMonthText,
                dow === 0 && { color: 'red' },
                dow === 6 && { color: 'blue' },
              ]}>
                {item.date.getDate()}
              </Text>

              {isToday && <View style={styles.todayDot} />}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const CELL_SIZE = 48;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal:16, flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:8 },
  title: { fontSize:20 },
  nav: { fontSize:30 },

  weekHeader: { flexDirection:'row', paddingHorizontal:6, marginBottom:4 },
  weekCell: { flex:1, alignItems:'center', justifyContent:'center', height:28 },
  weekText: { fontSize:15, color:'black' },

  grid: { paddingHorizontal:6 },
  cell: { flex:1, height:CELL_SIZE, alignItems:'center', justifyContent:'center', borderRadius:10, marginVertical:2 },
  outMonthCell: { opacity:0.35 },
  selectedCell: { backgroundColor:'#FDEEEE' },

  day: { fontSize:16, color:'black' },
  outMonthText: { color:'#444' },

  todayDot: {
    position: 'absolute',
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A48989',
  },
});
