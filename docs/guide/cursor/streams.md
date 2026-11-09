# Large files and streams

`createAsyncStreamReader` returns a cursor over a `ReadableStream` or an async iterable: a file stream, a `fetch`
response, a socket. It parses each chunk as it arrives, so the document is never buffered whole.

```ts twoslash
import { createReadStream } from 'node:fs';
import { EventType, XMLInputFactory } from '@exemplarjs/xml';

const xml = new XMLInputFactory();
const reader = xml.createAsyncStreamReader(createReadStream('/data/orders.xml'));

let orders = 0;
await reader.forEachEvent((type, r) => {
  if (type === EventType.START_ELEMENT && r.localName() === 'order') orders++;
});
console.log(orders);
// 3
```

## When to use an asynchronous reader

`createStreamReader` requires the whole document up front, as a string or as bytes. `createAsyncStreamReader` reads a
byte stream and reports the events of each chunk before it reads the next, so memory use depends on the chunk size,
not on the length of the document. Use it when the input is too large to buffer, or when events are needed before the
input has ended.

An asynchronous reader has every accessor of [the cursor](/guide/cursor/), with the same meaning: `localName()`,
`attribute()`, `text()` and the rest. Only advancing differs: `next()` can return `EventType.NEED_INPUT`, and the
methods that read several events in one call have `Async` variants.

## Open a file or a download

`createAsyncStreamReader(source?)` accepts:

- a web `ReadableStream<Uint8Array>`, such as a `fetch` response body
- any `AsyncIterable<Uint8Array>`, which includes Node.js readable streams
- a source object whose `stream` property is either of those
- any source `createStreamReader` accepts, such as a string or a `Uint8Array`
- no argument, which creates a reader to [feed directly](#feed-the-reader-yourself)

::: code-group

```ts twoslash [A file on Node]
import { createReadStream } from 'node:fs';

const reader = xml.createAsyncStreamReader(createReadStream('/data/orders.xml'));
```

```ts twoslash [A download]
const response = await fetch('https://example.org/orders.xml');

const reader = xml.createAsyncStreamReader(response.body!);
```

:::

A source object adds the document's `systemId`, which errors report, and an `encoding` known from outside the
document, such as the charset of an HTTP `Content-Type` header:

```ts twoslash
const response = await fetch('https://example.org/orders.xml');
// ---cut---
// Content-Type: application/xml; charset=ISO-8859-1
const charset = /charset=([^;]+)/i.exec(response.headers.get('content-type') ?? '')?.[1];

const reader = xml.createAsyncStreamReader({
  systemId: response.url,
  stream: response.body!,
  ...(charset !== undefined && { encoding: charset }),
});
```

[Factories and sources](/guide/sources#say-where-the-document-came-from) describes source objects and how the encoding
is determined.

## Handle every event with a function

`forEachEvent(callback)` runs the read loop. It calls the callback for every event from `START_DOCUMENT` to
`END_DOCUMENT`, awaits input whenever the reader runs out, and returns a promise that resolves at the end of the
document.

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
const reader = xml.createAsyncStreamReader(stream);
const customers: string[] = [];
let inCustomer = false;

await reader.forEachEvent((type, r) => {
  if (type === EventType.START_ELEMENT) inCustomer = r.localName() === 'customer';
  else if (type === EventType.END_ELEMENT) inCustomer = false;
  else if (type === EventType.CHARACTERS && inCustomer) customers.push(r.text());
});
```

The callback receives the event's type, which is never `NEED_INPUT`, and the reader itself, on which it can call any
accessor. The accessors describe the event only until the callback returns, so store anything needed later.

- The callback's return value is not awaited. To `await` between events, write the loop directly, as the next section
  shows.
- If the callback throws, reading stops and the promise rejects with the thrown value.
- If the document is not well formed, the promise rejects with an `XMLError`, after the callback has been called for
  every event before the error.

## Wait for input yourself

`forEachEvent` wraps a loop over `next()` and `fill()`. Writing that loop directly allows stopping early, keeping
state in local variables and awaiting other work between events. It is the cursor's loop with one more case:

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
const reader = xml.createAsyncStreamReader(stream);
let orders = 0;

for (let type = reader.next(); type !== EventType.END_DOCUMENT; type = reader.next()) {
  if (type === EventType.NEED_INPUT) await reader.fill();
  else if (type === EventType.START_ELEMENT && reader.localName() === 'order') orders++;
}
```

`EventType.NEED_INPUT` is not part of the document. `next()` returns it when the reader has consumed the input
received so far and cannot complete the next event. `fill()` returns a promise that resolves when the stream's next
chunk has arrived or the stream has ended; after that, call `next()` again.

For example, take a document that arrives in two chunks, split inside a tag:

```text
<orders><order id="1"/><ord
er id="2"/></orders>
```

Successive calls to `next()` return:

| `next()` returns               | Why                                                |
| ------------------------------ | -------------------------------------------------- |
| `NEED_INPUT`                   | No input has arrived yet                           |
| `START_DOCUMENT`               | The first chunk has arrived                        |
| `START_ELEMENT`                | `<orders>`                                         |
| `START_ELEMENT`, `END_ELEMENT` | `<order id="1"/>`                                  |
| `NEED_INPUT`                   | `<ord` is an incomplete tag                        |
| `START_ELEMENT`, `END_ELEMENT` | `<order id="2"/>`, completed by the second chunk   |
| `END_ELEMENT`                  | `</orders>`                                        |
| `NEED_INPUT`                   | The stream has not ended, so more input may follow |
| `END_DOCUMENT`                 | The stream has ended                               |

The protocol:

- A new asynchronous reader is positioned at `NEED_INPUT`, where the cursor over a whole document starts at
  `START_DOCUMENT`. The loop above handles that without a special case.
- `NEED_INPUT` can occur between any two events. Events are never partial: a tag split across two chunks is reported
  once, when it is complete.
- At `NEED_INPUT` the accessors have no event to describe. Calling `next()` again without calling `fill()` or feeding
  more input throws an `IllegalStateError`, so a loop that omits `fill()` fails immediately.

::: details Why `next()` does not return a promise
A chunk usually contains many events. `next()` returns each of them synchronously, so the loop awaits once per chunk,
not once per event.
:::

## Step from tag to tag

[`nextTag()`, `elementText()` and `skipElement()`](/guide/cursor/#step-from-tag-to-tag) read several events in one
call and cannot pause at `NEED_INPUT`. On an asynchronous reader, use `nextTagAsync()`, `elementTextAsync()` and
`skipElementAsync()`, which behave the same and await input when they need it:

```ts twoslash
import { EventType } from '@exemplarjs/xml';
// ---cut---
// <orders>
//   <order id="1001"><customer>Ada</customer><total>32.48</total></order>
//   ...
// </orders>
const reader = xml.createAsyncStreamReader(stream);

await reader.nextTagAsync(); // <orders>
while ((await reader.nextTagAsync()) === EventType.START_ELEMENT) {
  // at <order>
  const id = reader.attribute('id');
  await reader.nextTagAsync(); // <customer>
  const customer = await reader.elementTextAsync();
  await reader.nextTagAsync(); // <total>
  const total = await reader.elementTextAsync();
  await reader.nextTagAsync(); // </order>
  console.log(`${id}: ${customer}, ${total}`);
}
// 1001: Ada, 32.48
// 1002: Grace, 11.25
// 1003: Edsger, 40.47
```

Each of these methods returns a promise, so this style awaits once per call, where `forEachEvent` and the
`NEED_INPUT` loop await once per chunk.

::: warning
The synchronous `nextTag()`, `elementText()` and `skipElement()` exist on an asynchronous reader, and throw an
`IllegalStateError` when they reach `NEED_INPUT`. Code that uses them may pass a test with a small file and fail on a
large one.
:::

## Feed the reader yourself

For input that is pushed to callbacks, such as a socket's `data` events, create the reader with no source and supply
the input directly: `feed(chunk)` adds a `Uint8Array`, and `endOfInput()` marks the end of the input.

```ts twoslash
import type { Socket } from 'node:net';
import { type AsyncStreamReader, EventType } from '@exemplarjs/xml';
declare const socket: Socket;
declare function handle(reader: AsyncStreamReader, type: EventType): void;
// ---cut---
const reader = xml.createAsyncStreamReader();

socket.on('data', (chunk) => {
  reader.feed(chunk);
  drain();
});
socket.on('end', () => {
  reader.endOfInput();
  drain();
});

/** Handles every event that is complete so far. */
function drain() {
  for (
    let type = reader.next();
    type !== EventType.NEED_INPUT && type !== EventType.END_DOCUMENT;
    type = reader.next()
  ) {
    handle(reader, type);
  }
}
```

Nothing here is awaited. After each `feed()`, `drain()` reads events until `next()` returns `NEED_INPUT`, and the next
`data` event resumes from there.

A single loop that awaits `reader.fill()` works too: on a fed reader, `fill()` resolves at the next `feed()` or
`endOfInput()`.

Only a reader created with no source can be fed. On any other, `feed()` and `endOfInput()` throw an
`IllegalStateError`.

## Send a stream somewhere else

The tree builders, the stream writer and the SAX parser accept an asynchronous reader through methods whose names end
in `Async`, which await its input:

| To                     | Call                                          | See                                                        |
| ---------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| Build a tree for XPath | `await xdmBuilder.parseAsync(reader)`         | [One record at a time](/guide/cursor/records)              |
| Build a DOM tree       | `await domBuilder.parseAsync(reader)`         | [Building and reading a DOM](/guide/dom/)                  |
| Copy it to a writer    | `await writer.copyAsync(reader)`              | [Changing content with delegates](/guide/cursor/delegates) |
| Call SAX handlers      | `await saxParser.parseAsync(reader, handler)` | [Handling events with SAX](/guide/sax/)                    |

To build a tree of the whole stream, no reader is needed: pass the stream itself, as in
`await xdmBuilder.parseAsync(stream)`.

::: tip Coming from Java
The JDK's StAX cannot wait for input. For users of Aalto's non-blocking parser, `NEED_INPUT` corresponds to its
`EVENT_INCOMPLETE`, and `feed()` and `endOfInput()` to its input feeder.
:::

## Keep strings without keeping the input

The strings the cursor returns are slices of the input chunk they came from. In V8, a slice of 13 characters or more is a view of its parent string, and keeps the whole chunk in memory for as long as
the slice is referenced.

That has no effect when a value is used and discarded. It matters when a few strings from a very large document are
retained for a long time, in a map or an array: each retained string can keep a whole chunk alive.

In that case, set `copyStrings: true`. The cursor then returns copies, which reference no other string:

```ts twoslash
import { XMLInputFactory } from '@exemplarjs/xml';

const keeping = new XMLInputFactory({ copyStrings: true });
```

Event objects always copy their strings, so they can be retained without the option.

## Next steps

- [One record at a time](/guide/cursor/records): build a tree for each record of a large stream.
- [Dropping content with filters](/guide/cursor/filters): filters apply to an asynchronous reader as to any cursor.
