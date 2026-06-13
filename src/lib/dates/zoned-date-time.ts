type DateTimeParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  year: number;
};

const dateTimeLocalPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export function isDateTimeLocal(value: string): boolean {
  if (!dateTimeLocalPattern.test(value)) {
    return false;
  }

  try {
    parseDateTimeLocal(value);
    return true;
  } catch {
    return false;
  }
}

export function zonedDateTimeToUtcIso(value: string, timeZone: string): string {
  const target = parseDateTimeLocal(value);
  const targetUtcMillis = Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
    0,
  );
  let candidateUtcMillis = targetUtcMillis;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = getPartsInTimeZone(new Date(candidateUtcMillis), timeZone);
    const currentAsUtcMillis = Date.UTC(
      current.year,
      current.month - 1,
      current.day,
      current.hour,
      current.minute,
      current.second,
    );

    candidateUtcMillis += targetUtcMillis - currentAsUtcMillis;
  }

  const verified = getPartsInTimeZone(new Date(candidateUtcMillis), timeZone);

  if (!matchesTargetMinute(verified, target)) {
    throw new Error("Invalid local date and time for time zone.");
  }

  return new Date(candidateUtcMillis).toISOString();
}

export function utcIsoToDateTimeLocal(
  value: string | null,
  timeZone: string,
): string {
  if (!value) {
    return "";
  }

  const parts = getPartsInTimeZone(new Date(value), timeZone);

  return (
    [
      parts.year.toString().padStart(4, "0"),
      parts.month.toString().padStart(2, "0"),
      parts.day.toString().padStart(2, "0"),
    ].join("-") +
    "T" +
    [
      parts.hour.toString().padStart(2, "0"),
      parts.minute.toString().padStart(2, "0"),
    ].join(":")
  );
}

function parseDateTimeLocal(value: string): DateTimeParts {
  if (!dateTimeLocalPattern.test(value)) {
    throw new Error("Invalid local date and time.");
  }

  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = timePart.split(":").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error("Invalid local date and time.");
  }

  return {
    day,
    hour,
    minute,
    month,
    second: 0,
    year,
  };
}

function getPartsInTimeZone(date: Date, timeZone: string): DateTimeParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(date);

  const readPart = (type: Intl.DateTimeFormatPartTypes) => {
    const value = parts.find((part) => part.type === type)?.value;

    if (!value) {
      throw new Error("Could not format date and time.");
    }

    return Number(value);
  };

  return {
    day: readPart("day"),
    hour: readPart("hour"),
    minute: readPart("minute"),
    month: readPart("month"),
    second: readPart("second"),
    year: readPart("year"),
  };
}

function matchesTargetMinute(left: DateTimeParts, right: DateTimeParts) {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute
  );
}
