export const TIME_IN_MS = {
    SECOND: 1000,
    MINUTE: 1000 * 60,
    HOUR: 1000 * 60 * 60,
    DAY: 1000 * 60 * 60 * 24
};

export type TIsoPeriod = 'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds';

type TGetPeriodDate = (period: string, startDate?: Date) => Date;

export const secondsInPeriod: Record<TIsoPeriod, number> = {
    years: 31536000,
    months: 2592000, // 30 days, approximate value
    weeks: 604800,
    days: 86400,
    hours: 3600,
    minutes: 60,
    seconds: 1
};

export const periodTestRegExp = /^P(?=.*\d)(?:(?<years>\d+Y)?(?<months>\d+M)?(?<weeks>\d+W)?(?<days>\d+D)?)(?:T(?=.*\d)(?<hours>\d+H)?(?<minutes>\d+M)?(?<seconds>\d+S)?)?$/;

const parseNum = (str: string) => str ? parseInt(str) : 0;

export const parseISO8601Duration = (duration: string) => {
    const periodGroups = periodTestRegExp.exec(duration.toUpperCase());

    if (!periodGroups?.groups) {
        throw new Error(`Invalid ISO8601 duration: ${duration}`);
    }

    const {
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds
    } = periodGroups.groups || {};

    return {
        years: parseNum(years),
        months: parseNum(months),
        weeks: parseNum(weeks),
        days: parseNum(days),
        hours: parseNum(hours),
        minutes: parseNum(minutes),
        seconds: parseNum(seconds)
    };
};

export const durationToDays = (durationObj: ReturnType<typeof parseISO8601Duration>): number => {
    return (
        durationObj.years * 365 +
        durationObj.months * 30 +
        durationObj.weeks * 7 +
        durationObj.days +
        durationObj.hours / 24 +
        durationObj.minutes / (24 * 60) +
        durationObj.seconds / (24 * 60 * 60)
    );
};

/**
 * take period duration and date instance,
 * calculate new date via removing period values from startDate
 */
export const subtractPeriod: TGetPeriodDate = (period, startDate = new Date()) => {
    const {
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds
    } = parseISO8601Duration(period);

    const parsedStartDate = {
        year: startDate.getUTCFullYear(),
        month: startDate.getUTCMonth(),
        day: startDate.getUTCDate(),
        dayOffset: 0,
        hour: startDate.getUTCHours(),
        minutes: startDate.getUTCMinutes(),
        second: startDate.getUTCSeconds()
    };

    // When subtracting years or months the target month may be shorter than the
    // source month (e.g. March 31 minus one month has no February 31). In that
    // case dayOffset is set to the last valid day of the target month so that
    // the final Date.UTC call clamps to a real date instead of rolling over.
    if (years || months) {
        const maxDaysInTargetMonth = new Date(Date.UTC(
            parsedStartDate.year - years,
            // Day 0 of month N+1 is the last day of month N — used here to find
            // the last valid day of the target month without a lookup table.
            parsedStartDate.month - months + 1,
            0
        )).getUTCDate();

        if (parsedStartDate.day > maxDaysInTargetMonth) {
            parsedStartDate.dayOffset = maxDaysInTargetMonth;
        }
    }

    return new Date(Date.UTC(
        parsedStartDate.year - years,
        parsedStartDate.month - months,
        (parsedStartDate.dayOffset || parsedStartDate.day) - days - weeks * 7,
        parsedStartDate.hour - hours,
        parsedStartDate.minutes - minutes,
        parsedStartDate.second - seconds
    ));
};
