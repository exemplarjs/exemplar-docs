# Dates, times and durations

XPath has built-in types for dates, times and durations, with comparison and arithmetic defined on them: an expression
can compare two dates, add a duration to one, or subtract one from another. Use them when an expression filters, sorts
or computes by date.

The examples use this document, parsed into the tree `orders`:

```xml
<orders>
  <order id="o1" placed="2024-01-31" shipped="2024-02-02T09:30:00Z"/>
  <order id="o2" placed="2024-02-27" shipped="2024-03-01T16:05:00+01:00"/>
</orders>
```

```ts twoslash
declare const orders: import('@exemplarjs/xdm').XdmNode;
// ---cut---
const due = compiler.compile('//order ! (xs:date(@placed) + xs:dayTimeDuration("P30D"))');

due.evaluateStrings(orders); // ['2024-03-01', '2024-03-28']
```

Attribute and element values are untyped text, so `xs:date(@placed)` converts the attribute to a date. `P30D` is a
duration of thirty days.

## The date and time types

| Type                   | Holds                                                | Written as                  |
| ---------------------- | ---------------------------------------------------- | --------------------------- |
| `xs:date`              | A calendar day                                       | `2024-01-31`                |
| `xs:time`              | A time of day                                        | `16:05:00`                  |
| `xs:dateTime`          | A day and a time                                     | `2024-03-01T16:05:00+01:00` |
| `xs:dayTimeDuration`   | A length of time in days, hours, minutes and seconds | `P2DT9H30M`                 |
| `xs:yearMonthDuration` | A length of time in years and months                 | `P1Y6M`                     |

The formats are based on ISO 8601. Any date or time may end with a timezone: `Z` for UTC, or an offset such as `+01:00`. A
value without one is treated as being in the [implicit timezone](#set-the-clock-and-the-timezone) when it is compared
with one that has.

Durations start with `P`, with a `T` before the time part: `P30D` is thirty days, `PT1H30M` an hour and a half. There
are two duration types because a month has no fixed length, so months and days cannot be mixed in arithmetic.

The partial-date types, such as `xs:gYear` and `xs:gYearMonth`, support equality only: they have no ordering and no
arithmetic.

## Read a date in JavaScript

`evaluateString` returns a date as a string in the format above. `evaluateJS` returns an `XMLGregorianCalendar` from
`@exemplarjs/xdm`: an immutable object with a field for each component of the value.

```ts twoslash
declare const orders: import('@exemplarjs/xdm').XdmNode;
// ---cut---
import type { XMLGregorianCalendar } from '@exemplarjs/xdm';

const shippedAt = compiler.compile('xs:dateTime(//order[@id = "o2"]/@shipped)');
const [shipped] = shippedAt.evaluateJS(orders) as [XMLGregorianCalendar<'dateTime'>];

shipped.year; // 2024
shipped.month; // 3
shipped.day; // 1
shipped.hour; // 16
shipped.minute; // 5
shipped.second; // 0
shipped.timezone; // 60: minutes east of UTC
shipped.toString(); // '2024-03-01T16:05:00+01:00'
```

The type parameter identifies the XPath type and narrows the fields: on an `XMLGregorianCalendar<'date'>`, `hour` is
`undefined` and is typed as such. `timezone` is `undefined` for a value without one.

::: tip Coming from Java
`XMLGregorianCalendar` and `Duration` have the names and fields of the classes in `javax.xml.datatype`, without the
setters.
:::

### Convert to a JavaScript Date

`toDate()` returns the same instant as a JavaScript `Date`. It applies to dates and date-times; a date converts to its
midnight.

```ts twoslash
declare const shipped: import('@exemplarjs/xdm').XMLGregorianCalendar<'dateTime'>;
declare const placed: import('@exemplarjs/xdm').XMLGregorianCalendar<'date'>;
// ---cut---
shipped.toDate(); // 2024-03-01T15:05:00.000Z

// '2024-01-31' has no timezone, so pass one.
placed.toDate('+01:00'); // 2024-01-30T23:00:00.000Z
placed.toDate(0); // 2024-01-31T00:00:00.000Z
```

::: warning
A `Date` is an instant, but `2024-01-31` without a timezone is not. Pass the timezone to `toDate`, as an offset such as
`'+01:00'` or as minutes east of UTC. Without an argument, the machine's local timezone is used, and the same code
produces different instants on different machines.
:::

An `xs:time` has no date, so `toDate` on one is a type error in TypeScript, and throws a `RangeError` where types are
not checked.

## Read a duration in JavaScript

`evaluateJS` returns a duration as a `Duration`, also from `@exemplarjs/xdm`.

```ts twoslash
declare const orders: import('@exemplarjs/xdm').XdmNode;
// ---cut---
import type { Duration } from '@exemplarjs/xdm';

const delay = compiler.compile(`
  let $order := //order[@id = "o1"]
  return xs:dateTime($order/@shipped) - xs:dateTime($order/@placed || "T00:00:00Z")
`);
const [wait] = delay.evaluateJS(orders) as [Duration];

wait.toString(); // 'P2DT9H30M'
wait.days; // 2
wait.hours; // 9
wait.minutes; // 30
wait.totalSeconds.toNumber(); // 207000
```

`@placed` is a date with no time or timezone, so the expression appends `T00:00:00Z` to its text to read it as midnight
UTC.

A `Duration` exposes its value in two forms:

- **By component.** `years`, `months`, `days`, `hours`, `minutes` and `seconds` are the components that `toString()`
  writes, each unsigned. A duration created from `PT36H` has 1 day and 12 hours. `sign` is `-1`, `0` or `1`.
- **As a total.** `totalSeconds`, or `totalMonths` for a duration in years and months, is the whole duration in one
  unit, with its sign.

`seconds` and `totalSeconds` are exact decimals, so call `toNumber()` for a JavaScript number.

## Pass a date in

Declare a [variable](/guide/xpath/variables) with a date type, and pass a string, a `Date` or an `XMLGregorianCalendar`.

```ts twoslash
declare const orders: import('@exemplarjs/xdm').XdmNode;
// ---cut---
const placedAfter = compiler.compile('//order[xs:date(@placed) gt $since]/@id', {
  variables: { since: 'xs:date' },
});

placedAfter.evaluateStrings(orders, { variables: { since: '2024-02-01' } }); // ['o2']
placedAfter.evaluateStrings(orders, { variables: { since: new Date('2024-02-01T00:00:00Z') } }); // ['o2']
```

A string is parsed as the declared type, so `'2024-02-01'` is that date, with no timezone. A `Date` is an instant, so it
converts to an `xs:dateTime` in UTC, such as `2024-06-01T10:00:00Z`, regardless of the local timezone. For an `xs:date`
variable it becomes the UTC date, `2024-06-01Z`. To pass local calendar dates, format the string in application code or
use a [converter](/guide/xpath/variables#customize-the-conversion).

Durations work the same way: declare `xs:dayTimeDuration` or `xs:yearMonthDuration` and pass a string such as `'P30D'`,
or a `Duration`.

## Do arithmetic with dates

Subtracting two dates returns a duration, and adding a duration to a date returns a date.

```ts twoslash
// Days between two dates.
compiler.compile('xs:date("2024-03-01") - xs:date("2024-01-31")').evaluateString(); // 'P30D'
compiler.compile('(xs:date("2024-03-01") - xs:date("2024-01-31")) div xs:dayTimeDuration("P1D")').evaluateNumber(); // 30

// A month later lands on the last day of a shorter month.
compiler.compile('xs:date("2024-01-31") + xs:yearMonthDuration("P1M")').evaluateString(); // '2024-02-29'
```

Dates and durations compare with the ordinary comparison operators. This expression selects the orders that took more
than three days to ship:

```ts twoslash
declare const orders: import('@exemplarjs/xdm').XdmNode;
// ---cut---
const slow = compiler.compile(`
  //order[xs:dateTime(@shipped) - xs:dateTime(@placed || "T00:00:00Z") > xs:dayTimeDuration("P3D")]/@id
`);

slow.evaluateStrings(orders); // ['o2']
```

Both operands of the subtraction have a timezone here. Without the appended `Z`, the `@placed` operand would have none,
the subtraction would use the [implicit timezone](#set-the-clock-and-the-timezone), and the result would depend on the
machine.

Component functions extract one field of a value inside an expression: `year-from-date`, `month-from-date`,
`hours-from-dateTime`, `days-from-duration` and the rest. `adjust-dateTime-to-timezone` converts a value to another
timezone. The [XPath functions](/reference/xpath-functions) reference lists them all.

## Set the clock and the timezone

Two inputs to an evaluation come from the machine it runs on:

- **The clock.** `current-dateTime()`, `current-date()` and `current-time()` return the instant the evaluation started,
  which is constant throughout one evaluation.
- **The implicit timezone.** A date or time without a timezone is treated as being in this one whenever it is combined
  with a value that has a timezone. By default it is the machine's offset from UTC.

Both are set under `temporal`, in the options that every evaluation method takes after the context. Set them when a
result must be reproducible: in tests, in reports that are re-run, and on servers in a different timezone from their
users.

```ts twoslash
const now = compiler.compile('current-dateTime()');

now.evaluateString(null, {
  temporal: {
    currentDateTime: new Date('2024-06-01T12:00:00Z'),
    implicitTimezone: '+02:00',
  },
});
// '2024-06-01T14:00:00+02:00'
```

`implicitTimezone` is an offset such as `'+02:00'`, or minutes east of UTC. It is a fixed offset, not an IANA zone name
such as `Europe/Paris`; anything else throws a `RangeError`.

The implicit timezone can change a result. Whether a date without a timezone equals the same date in UTC depends on it:

```ts twoslash
const same = compiler.compile('xs:date("2024-01-01") eq xs:date("2024-01-01Z")');

same.evaluateBoolean(null, { temporal: { implicitTimezone: 0 } }); // true
same.evaluateBoolean(null, { temporal: { implicitTimezone: '+02:00' } }); // false
```

Variables go in the same options object: `{ variables: { since }, temporal: { implicitTimezone: 0 } }`.

## Format dates for people

`format-date`, `format-dateTime` and `format-time` format a value with a _picture_: a string in which each `[…]` marker
is replaced by a component of the value.

```ts twoslash
compiler.compile('format-date(xs:date("2024-01-31"), "[D1o] [MNn] [Y0001]")').evaluateString();
// '31st January 2024'

compiler.compile('format-date(xs:date("2024-01-31"), "[FNn], [D] [MNn] [Y]")').evaluateString();
// 'Wednesday, 31 January 2024'

compiler
  .compile('format-dateTime(xs:dateTime("2024-03-01T16:05:00+01:00"), "[Y0001]-[M01]-[D01] [H01]:[m01] [Z]")')
  .evaluateString();
// '2024-03-01 16:05 +01:00'

compiler.compile('format-time(xs:time("16:05:00"), "[h]:[m01] [P]")').evaluateString();
// '4:05 pm'
```

| Marker    | Output                        | Marker  | Output                     |
| --------- | ----------------------------- | ------- | -------------------------- |
| `[Y0001]` | The year, four digits         | `[H01]` | The hour, 00 to 23         |
| `[M01]`   | The month, two digits         | `[h]`   | The hour, 1 to 12          |
| `[MNn]`   | The month's name              | `[m01]` | The minute                 |
| `[D]`     | The day                       | `[s01]` | The second                 |
| `[D1o]`   | The day as an ordinal: `31st` | `[P]`   | `am` or `pm`               |
| `[FNn]`   | The day of the week's name    | `[Z]`   | The timezone, as an offset |

The third argument is a language tag, which selects the language of month and day names:

```ts twoslash
compiler.compile('format-date(xs:date("2024-01-31"), "[FNn], [D]. [MNn] [Y]", "de", (), ())').evaluateString();
// 'Mittwoch, 31. Januar 2024'
```

The names come from the runtime's `Intl` data. Ordinals such as `31st` and numbers written as words are in English only.

When a picture requests one of those in another language, or names a language that the runtime does not support, the
whole result is written in English and prefixed with the marker `[Language: en]`:

```ts twoslash
compiler.compile('format-date(xs:date("2024-01-31"), "[D1o] [MNn]", "de", (), ())').evaluateString();
// '[Language: en]31st January'
```

Timezones are written as offsets, not as names. The calendar is always Gregorian; requesting another produces a
Gregorian date prefixed with the marker `[Calendar: AD]`.

## Next steps

- [Passing variables](/guide/xpath/variables): declared types and converters.
- [Getting results](/guide/xpath/results): the other JavaScript values `evaluateJS` returns.
- [XPath functions](/reference/xpath-functions): every date and time function.
