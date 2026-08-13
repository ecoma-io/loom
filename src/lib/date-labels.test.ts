import { parseDate } from "@internationalized/date";
import { describe, expect, it } from "vitest";
import {
  CALENDAR_PANEL_LABELS,
  DATE_SEGMENT_LABELS,
  RANGE_CELL_LABELS,
  TIME_SEGMENT_LABELS,
  emptySegmentValueText,
  formatFullDay,
  isDateSegmentPart,
  isTimeSegmentPart,
  monthName,
} from "./date-labels";

describe("DATE_SEGMENT_LABELS", () => {
  it("names the four date segments Reka renders", () => {
    expect(DATE_SEGMENT_LABELS.month).toBe("Month");
    expect(DATE_SEGMENT_LABELS.day).toBe("Day");
    expect(DATE_SEGMENT_LABELS.year).toBe("Year");
    expect(DATE_SEGMENT_LABELS.era).toBe("Era");
  });

  it("replaces Reka's aria-valuetext='Empty' with 'Not set'", () => {
    expect(DATE_SEGMENT_LABELS.empty).toBe("Not set");
  });

  describe("filledMonth", () => {
    it("produces Reka's English format for an English locale", () => {
      // Reka writes `"5 - May"`. The English default matches that format so that
      // a host who does not override it sees nothing change.
      expect(DATE_SEGMENT_LABELS.filledMonth({ value: 5, locale: "en" })).toBe("5 - May");
    });

    it("uses the locale's month name from Intl.DateTimeFormat", () => {
      // The month name comes from `Intl.DateTimeFormat`, not from a hard-coded
      // table, so a locale change produces the locale's own word.
      const january = DATE_SEGMENT_LABELS.filledMonth({ value: 1, locale: "vi-VN" });
      // `Intl.DateTimeFormat("vi-VN", { month: "long" })` capitalises the month
      // word in Vietnamese: "Tháng 1", not "tháng 1".
      expect(january).toContain("Tháng 1");
    });

    it("places the month name after the number for English", () => {
      expect(DATE_SEGMENT_LABELS.filledMonth({ value: 12, locale: "en" })).toBe("12 - December");
    });
  });
});

describe("TIME_SEGMENT_LABELS", () => {
  it("names the four clock segments Reka renders", () => {
    expect(TIME_SEGMENT_LABELS.hour).toBe("Hour");
    expect(TIME_SEGMENT_LABELS.minute).toBe("Minute");
    expect(TIME_SEGMENT_LABELS.second).toBe("Second");
    expect(TIME_SEGMENT_LABELS.dayPeriod).toBe("AM or PM");
  });

  it("replaces Reka's aria-valuetext='Empty' with 'Not set'", () => {
    expect(TIME_SEGMENT_LABELS.empty).toBe("Not set");
  });

  describe("filledDayPeriod", () => {
    it("returns the dayPeriod unchanged for Latin-script locales", () => {
      // The identity function for English: Reka's "AM"/"PM" are correct for
      // Latin-script locales, so the default passes them through.
      expect(TIME_SEGMENT_LABELS.filledDayPeriod({ dayPeriod: "AM" })).toBe("AM");
      expect(TIME_SEGMENT_LABELS.filledDayPeriod({ dayPeriod: "PM" })).toBe("PM");
    });
  });
});

describe("CALENDAR_PANEL_LABELS", () => {
  it("names the calendar popover's parts", () => {
    expect(CALENDAR_PANEL_LABELS.calendar).toBe("Calendar");
    expect(CALENDAR_PANEL_LABELS.openCalendar).toBe("Open calendar");
    expect(CALENDAR_PANEL_LABELS.previousMonth).toBe("Previous month");
    expect(CALENDAR_PANEL_LABELS.nextMonth).toBe("Next month");
  });
});

describe("emptySegmentValueText", () => {
  it("replaces the value text of an empty digit segment", () => {
    expect(emptySegmentValueText("day", "dd", "Not set")).toEqual({ "aria-valuetext": "Not set" });
    expect(emptySegmentValueText("month", "mm", "Chưa đặt")).toEqual({
      "aria-valuetext": "Chưa đặt",
    });
    expect(emptySegmentValueText("year", "aaaa", "Not set")).toEqual({
      "aria-valuetext": "Not set",
    });
    expect(emptySegmentValueText("hour", "hh", "Not set")).toEqual({ "aria-valuetext": "Not set" });
    expect(emptySegmentValueText("minute", "mm", "Not set")).toEqual({
      "aria-valuetext": "Not set",
    });
    expect(emptySegmentValueText("second", "ss", "Not set")).toEqual({
      "aria-valuetext": "Not set",
    });
  });

  it("leaves a filled segment alone, returning an empty object", () => {
    // The returned `{}` is what keeps Vue's `mergeProps` from overwriting Reka's
    // own `aria-valuetext` — an absent key merges as nothing at all.
    expect(emptySegmentValueText("day", "9", "Not set")).toEqual({});
    expect(emptySegmentValueText("month", "3", "Not set")).toEqual({});
  });

  it("leaves non-emptiable parts alone regardless of value", () => {
    // `dayPeriod` and `era` are never written as "Empty" by Reka, and their
    // placeholders are not letters either — an unset dayPeriod reads "AM".
    expect(emptySegmentValueText("dayPeriod", "AM", "Not set")).toEqual({});
    expect(emptySegmentValueText("era", "AD", "Not set")).toEqual({});
  });
});

describe("isDateSegmentPart", () => {
  it("recognises the four date parts", () => {
    expect(isDateSegmentPart("month")).toBe(true);
    expect(isDateSegmentPart("day")).toBe(true);
    expect(isDateSegmentPart("year")).toBe(true);
    expect(isDateSegmentPart("era")).toBe(true);
  });

  it("rejects clock parts, literals and the timezone part", () => {
    expect(isDateSegmentPart("hour")).toBe(false);
    expect(isDateSegmentPart("minute")).toBe(false);
    expect(isDateSegmentPart("dayPeriod")).toBe(false);
    expect(isDateSegmentPart("literal")).toBe(false);
    expect(isDateSegmentPart("timeZoneName")).toBe(false);
  });
});

describe("isTimeSegmentPart", () => {
  it("recognises the four clock parts", () => {
    expect(isTimeSegmentPart("hour")).toBe(true);
    expect(isTimeSegmentPart("minute")).toBe(true);
    expect(isTimeSegmentPart("second")).toBe(true);
    expect(isTimeSegmentPart("dayPeriod")).toBe(true);
  });

  it("rejects date parts, literals and the timezone part", () => {
    expect(isTimeSegmentPart("month")).toBe(false);
    expect(isTimeSegmentPart("day")).toBe(false);
    expect(isTimeSegmentPart("year")).toBe(false);
    expect(isTimeSegmentPart("era")).toBe(false);
    expect(isTimeSegmentPart("literal")).toBe(false);
    expect(isTimeSegmentPart("timeZoneName")).toBe(false);
  });
});

describe("monthName", () => {
  it("returns the English month name for an English locale", () => {
    expect(monthName("en", 1)).toBe("January");
    expect(monthName("en", 12)).toBe("December");
  });

  it("returns the locale's own month name", () => {
    // `Intl.DateTimeFormat("vi-VN")` capitalises the month word: "Tháng 1".
    expect(monthName("vi-VN", 1)).toBe("Tháng 1");
  });
});

describe("formatFullDay", () => {
  it("writes out weekday, day, month and year in the locale", () => {
    // 2026-03-09 is a Monday.
    const date = parseDate("2026-03-09");
    expect(formatFullDay("en", date)).toBe("Monday, March 9, 2026");
  });
});

describe("RANGE_CELL_LABELS", () => {
  it("names an unselected day without a qualifier", () => {
    const date = parseDate("2026-03-09");
    expect(RANGE_CELL_LABELS.cell({ locale: "en", date, part: undefined })).toBe(
      "Monday, March 9, 2026",
    );
  });

  it("qualifies the start of a range", () => {
    const date = parseDate("2026-03-09");
    expect(RANGE_CELL_LABELS.cell({ locale: "en", date, part: "start" })).toBe(
      "Monday, March 9, 2026, first day of the range",
    );
  });

  it("qualifies a one-day range as both start and end", () => {
    const date = parseDate("2026-03-09");
    expect(RANGE_CELL_LABELS.cell({ locale: "en", date, part: "both" })).toBe(
      "Monday, March 9, 2026, the whole range, first and last day",
    );
  });
});
