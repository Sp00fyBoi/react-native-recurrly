import { DEFAULT_CURRENCY } from "@/lib/currency";
import { formatCurrency } from "@/lib/utils";
import { Text, View } from "react-native";

const PLOT_HEIGHT = 180;
const TICK_COUNT = 4;

/**
 * Fixed width for the y-axis column so the day-label row below can reserve the
 * exact same space and keep each label under its bar. Left intrinsic, the
 * column resized with the tick text — which INR totals made wide enough to
 * push the labels visibly out of line.
 */
const Y_AXIS_WIDTH = 40;
/** `mr-3` on `.chart-y-axis`, mirrored into the spacer below. */
const Y_AXIS_GUTTER = 12;

/**
 * Single-series bar chart of renewal spend across the next seven days.
 *
 * Deliberately plain Views rather than a chart library: one series, seven
 * categories and a linear scale need no dependency. Being one series it needs
 * no legend, and only the peak bar is labelled — a number over every bar is
 * noise.
 */
const WeeklySpendChart = ({
  // `days` arrives already converted by `selectDailySpend`, so the axis and the
  // tooltip are both in the reporting currency.
  days,
  currency = DEFAULT_CURRENCY,
}: WeeklySpendChartProps) => {
  const maxValue = Math.max(...days.map((day) => day.total), 0);
  const hasSpend = maxValue > 0;

  // Round the axis up to a clean number so ticks read well.
  const niceMax = hasSpend ? roundUpToNice(maxValue) : 0;
  const peakIndex = hasSpend
    ? days.reduce(
        (best, day, index) => (day.total > days[best].total ? index : best),
        0,
      )
    : -1;

  const ticks = hasSpend
    ? Array.from({ length: TICK_COUNT + 1 }, (_, index) =>
        Math.round((niceMax / TICK_COUNT) * (TICK_COUNT - index)),
      )
    : [];

  return (
    <View className="chart-card">
      {hasSpend ? (
        <>
          <View className="chart-plot">
            {/* Y axis — recessive, values only */}
            <View
              className="chart-y-axis"
              style={{ height: PLOT_HEIGHT, width: Y_AXIS_WIDTH }}
            >
              {ticks.map((tick) => (
                <Text key={tick} className="chart-y-label" numberOfLines={1}>
                  {tick}
                </Text>
              ))}
            </View>

            <View className="chart-area" style={{ height: PLOT_HEIGHT }}>
              {/* Gridlines sit behind the marks and stay low-contrast */}
              {ticks.map((tick, index) => (
                <View
                  key={tick}
                  className="chart-gridline"
                  style={{ top: (PLOT_HEIGHT / TICK_COUNT) * index }}
                />
              ))}

              <View className="chart-bars" style={{ height: PLOT_HEIGHT }}>
                {days.map((day, index) => {
                  const isPeak = index === peakIndex;
                  const ratio = niceMax > 0 ? day.total / niceMax : 0;
                  // Keep a sliver visible for days with no renewals.
                  const height =
                    day.total > 0 ? Math.max(ratio * PLOT_HEIGHT, 6) : 4;

                  return (
                    <View key={day.label + index} className="chart-bar-slot">
                      {isPeak && (
                        <View
                          className="chart-tooltip"
                          style={{ bottom: height + 10 }}
                        >
                          <Text className="chart-tooltip-text">
                            {formatCurrency(day.total, currency)}
                          </Text>
                        </View>
                      )}
                      <View
                        className={[
                          "chart-bar",
                          isPeak ? "chart-bar-active" : "",
                          day.total === 0 ? "chart-bar-empty" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        style={{ height }}
                      />
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          <View className="chart-day-row">
            {/* Spacer matching the y-axis column so labels line up with bars */}
            <View style={{ width: Y_AXIS_WIDTH + Y_AXIS_GUTTER }} />
            {days.map((day, index) => (
              <Text key={day.label + index} className="chart-day">
                {day.label}
              </Text>
            ))}
          </View>
        </>
      ) : (
        <Text className="home-empty-state">
          Nothing renews in the next 7 days.
        </Text>
      )}
    </View>
  );
};

/** 47 → 50, 412 → 450: keeps axis ticks on readable round numbers. */
const roundUpToNice = (value: number): number => {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = magnitude / 2;
  return Math.ceil(value / step) * step;
};

export default WeeklySpendChart;
