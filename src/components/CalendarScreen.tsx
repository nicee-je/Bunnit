import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList, Animated,
  PanResponder, LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

type Cell = { date: Date; inMonth: boolean };

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const COLS = 7;
const ROWS = 6;

const CELL_SIZE = 48;
const V_MARGIN = 2;
const ROW_HEIGHT = CELL_SIZE + V_MARGIN * 2;

const DRAG_ZONE_H = 24;
const DRAG_TRIGGER = 28;

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const isSameYMD = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

function useMonthMatrix(year: number, month: number) {
  return useMemo<Cell[]>(() => {
    const firstDow = new Date(year, month, 1).getDay();
    const curDays = daysInMonth(year, month);
    const prevDays = daysInMonth(year, month - 1);

    const cells: Cell[] = [];
    for (let i = firstDow - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, prevDays - i), inMonth: false });
    }
    for (let d = 1; d <= curDays; d++) {
      cells.push({ date: new Date(year, month, d), inMonth: true });
    }
    let next = 1;
    while (cells.length < ROWS * COLS) {
      cells.push({ date: new Date(year, month + 1, next++), inMonth: false });
    }
    return cells;
  }, [year, month]);
}

function useWeekCells(baseDate: Date, cursorY: number, cursorM: number) {
  return useMemo<Cell[]>(() => {
    const start = new Date(baseDate);
    start.setHours(0, 0, 0, 0);
    start.setDate(baseDate.getDate() - baseDate.getDay()); // 일요일 시작
    const arr: Cell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push({ date: d, inMonth: d.getFullYear() === cursorY && d.getMonth() === cursorM });
    }
    return arr;
  }, [baseDate, cursorY, cursorM]);
}

export default function CalendarScreen() {
  const today = new Date();

  // 최초 선택 날짜 = 오늘
  const [selected, setSelected] = useState<Date>(() => new Date());

  // 현재 보이는 달 커서
  const [cursor, setCursor] = useState(() => ({
    y: today.getFullYear(),
    m: today.getMonth(),
  }));

  // 화면 마운트시 날짜 초기화
  useFocusEffect(
    useCallback(() => {
      const t = new Date();
      setCursor({ y: t.getFullYear(), m: t.getMonth() });
      setSelected(new Date());
    }, [])
  );

  const monthCells = useMonthMatrix(cursor.y, cursor.m);
  const weekCells = useWeekCells(selected, cursor.y, cursor.m);

  // 월간 그리드에서 선택일의 행
  const selectedIndex = useMemo(() => {
    const idx = monthCells.findIndex((c) => isSameYMD(c.date, selected));
    return idx >= 0 ? idx : 0;
  }, [monthCells, selected]);
  const selectedRow = Math.floor(selectedIndex / COLS);

  // 전환 애니메이션
  const progress = useRef(new Animated.Value(0)).current;
  const [isWeekly, setIsWeekly] = useState(false);

  const gridHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [ROWS * ROW_HEIGHT, ROW_HEIGHT],
    extrapolate: 'clamp',
  });

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -selectedRow * ROW_HEIGHT],
    extrapolate: 'clamp',
  });

  const anchorDateForWeekly = () => new Date(cursor.y, cursor.m, 1);

  // 모드 전환
  const animateTo = (toValue: 0 | 1) => {
    Animated.timing(progress, { toValue, duration: 220, useNativeDriver: false })
    .start(() => {
      if (toValue === 1) {
        // 월간 -> 주간 : 해당 달 1일이 포함된 '첫째 주'부터
          const base = anchorDateForWeekly();
          setSelected(base); // 주간은 selected를 기준으로 그림
          setCursor({ y: base.getFullYear(), m: base.getMonth() });
        } else {
          // 주간 -> 월간 : 현재 선택일의 달을 보이게
          const base = selected;
          setCursor({ y: base.getFullYear(), m: base.getMonth() });
        }
        setIsWeekly(toValue === 1);
      });
  };

  // 스와이프 핸들
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_: any, g: any) =>
        Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),

      onPanResponderRelease: (_: any, g: any) => {
        if (g.dy < -DRAG_TRIGGER) animateTo(1);
        else if (g.dy > DRAG_TRIGGER) animateTo(0);
        else progress.stopAnimation((v: any) => animateTo(v > 0.5 ? 1 : 0));
      },

      onPanResponderTerminate: (_: any, g: any) => {
        if (g.dy < -DRAG_TRIGGER) animateTo(1);
        else if (g.dy > DRAG_TRIGGER) animateTo(0);
        else progress.stopAnimation((v: any) => animateTo(v > 0.5 ? 1 : 0));
      },
    })
  ).current;

  // pre, next 이동
  const goPrev = () => {
    if (isWeekly) {
      const d = new Date(selected);
      d.setDate(d.getDate() - 7);
      setSelected(d);
      setCursor({ y: d.getFullYear(), m: d.getMonth() });
    } else {
      setCursor(({ y, m }) => ({ y: y + (m - 1 < 0 ? -1 : 0), m: (m + 11) % 12 }));
    }
  };

  const goNext = () => {
    if (isWeekly) {
      const d = new Date(selected);
      d.setDate(d.getDate() + 7);
      setSelected(d);
      setCursor({ y: d.getFullYear(), m: d.getMonth() });
    } else {
      setCursor(({ y, m }) => ({ y: y + (m + 1 > 11 ? 1 : 0), m: (m + 1) % 12 }));
    }
  };

  // 날짜 탭
  const onPressDay = (d: Date) => {
    setSelected(d);
    if (cursor.y !== d.getFullYear() || cursor.m !== d.getMonth()) {
      setCursor({ y: d.getFullYear(), m: d.getMonth() });
    }
  };

  // 주간 달력 width 7칸 나누기
  const [weekRowWidth, setWeekRowWidth] = useState<number>(0);
  const onWeekRowLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    requestAnimationFrame(() => setWeekRowWidth(w));
  };
  const weekColStyle = useMemo(
    () => ({ width: weekRowWidth > 0 ? weekRowWidth / 7 : undefined }),
    [weekRowWidth]
  );

  // 달력 셀
  const DayCell = ({
    cell,
    index,
    monthly,
  }: {
    cell: Cell;
    index: number;
    monthly: boolean;
  }) => {
    const dow = index % 7;
    const isToday = isSameYMD(cell.date, today);
    const isSelected = isSameYMD(cell.date, selected);
    return (
      <Pressable
        style={[
          styles.cell,
          monthly && styles.cellMonth, // 월간일 때만 flex:1
          !cell.inMonth && styles.outMonthCell,
          isSelected && styles.selectedCell,
        ]}
        onPress={() => onPressDay(cell.date)}
      >
        <Text
          style={[
            styles.dayText,
            !cell.inMonth && styles.outMonthText,
            dow === 0 && { color: 'red' },
            dow === 6 && { color: 'blue' },
          ]}
        >
          {cell.date.getDate()}
        </Text>
        {isToday && <View style={styles.todayDot} />}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Pressable onPress={goPrev} hitSlop={10} style={styles.navBtn}>
          <Text style={styles.navArrow}>{'‹'}</Text>
        </Pressable>

        <Text style={styles.title}>
          {isWeekly ? `${cursor.y}년 ${cursor.m + 1}월` : `${cursor.y}년 ${cursor.m + 1}월`}
        </Text>

        <Pressable onPress={goNext} hitSlop={10} style={[styles.navBtn, { alignItems: 'flex-end' }]}>
          <Text style={styles.navArrow}>{'›'}</Text>
        </Pressable>
      </View>

      {/* 요일 */}
      <View style={styles.weekHeader}>
        {WEEK_LABELS.map((w, i) => (
          <View key={w} style={styles.weekCell}>
            <Text style={[styles.weekText, i === 0 && { color: 'red' }, i === 6 && { color: 'blue' }]}>{w}</Text>
          </View>
        ))}
      </View>

      {/* 그리드 */}
      <Animated.View style={[styles.gridWrapper, { height: gridHeight }]}>
        <Animated.View style={!isWeekly ? { transform: [{ translateY }] } : undefined}>
          {isWeekly ? (
            // 주간 달력
            <View style={styles.weekRow} onLayout={onWeekRowLayout}>
              {weekCells.map((c, idx) => (
                <View key={c.date.toISOString()} style={[styles.weekCol, weekColStyle]}>
                  <DayCell cell={c} index={idx} monthly={false} />
                </View>
              ))}
            </View>
          ) : (
            // 월간 달력
            <FlatList
              data={monthCells}
              keyExtractor={(it: any) => it.date.toISOString()}
              numColumns={7}
              scrollEnabled={false}
              renderItem={({ item, index }) => (
                <DayCell cell={item} index={index} monthly={true} />
              )}
              contentContainerStyle={styles.grid}
              columnWrapperStyle={{ flex: 1 }}
            />
          )}
        </Animated.View>
      </Animated.View>

      {/* 하단 스와이프 핸들 */}
      <View style={styles.dragZone} pointerEvents="box-only" {...panResponder.panHandlers}>
        <View style={styles.handlePill} />
      </View>

      {/* 달력 아래 영역 */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>일정이 없습니다.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },

  header: {
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  title: { fontSize: 18 },

  navBtn: { width: 72, justifyContent: 'center' },
  navArrow: { fontSize: 35, textAlign: 'left' },

  weekHeader: { flexDirection: 'row', paddingHorizontal: 6, marginBottom: 4 },
  weekCell: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 26 },
  weekText: { fontSize: 15, color: 'black' },

  gridWrapper: { overflow: 'hidden' },
  grid: { paddingHorizontal: 6 },

  weekRow: { flexDirection: 'row', paddingHorizontal: 6 },
  weekCol: { flex: 1 },

  // 공통 셀
  cell: {
    height: ROW_HEIGHT - V_MARGIN * 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: V_MARGIN,
  },
  
  cellMonth: { flex: 1 },

  outMonthCell: { opacity: 0.35 },
  selectedCell: { backgroundColor: '#FDEEEE' },

  dayText: { fontSize: 16, color: 'black' },
  outMonthText: { color: 'black' },

  todayDot: {
    position: 'absolute',
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#A48989',
  },

  dragZone: {
    height: DRAG_ZONE_H,
    alignItems: 'center',
    justifyContent: 'center',
  },

  handlePill: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#ddd' },

  footer: { marginTop: 8, alignItems: 'center' },
  footerText: { color: '#444' },
});
