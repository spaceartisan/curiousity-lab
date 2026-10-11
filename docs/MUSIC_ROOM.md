# Music room

Music Studio now opens on real music. All of it is public domain and works offline once the app is installed.

## Name that piece

A short, two-phrase excerpt of a real piece plays on a sampled grand piano. Choose from four titles, or pick **Name it yourself**, think of the answer, and reveal it.

- **Collections:** classical (Beethoven, Mozart, Chopin, Bach, Debussy, Satie, Schumann, Schubert, Brahms, Grieg), Scott Joplin's rags, and hymns and carols.
- **By ear or from the score.** With _From the score_, she sees the engraved opening and can sight-read it before hearing anything.
- **Slower** plays at three-quarter speed. **Tune only** plays just the top line.
- **Clues** are optional: first the era and style, then the composer.
- The reveal shows the title, composer, date, the full work name, a short note about the piece, and the score, highlighted as it plays. She can mark favorites.
- Wrong choices just reveal the answer. Nothing is scored or timed.

## Play it yourself

The excerpt's score appears above a real keyboard with black keys. She plays the top line one note at a time, and the piano waits for her. With **Piano plays the rest**, each correct note brings in the accompaniment underneath it. **Show the next key** can be turned off for sight-reading.

## Piano

A three-octave grand piano with an octave shift and a sustain pedal.

## Earlier exercises

The original phrase, melody-matching, rhythm and free-piano exercises are unchanged and kept on their own tab.

## Where the music comes from

- **Piano pieces and rags:** [Mutopia Project](https://www.mutopiaproject.org/) public-domain editions. The excerpts are cut from their MIDI files, so the notes match the published editions. Each excerpt was compared against Mutopia's engraved preview. The _Moonlight_ opening comes from Mutopia's guitar-duo edition, transposed back to C♯ minor with the bass doubled at the octave.
- **Hymns and carols:** [Open Hymnal Project](http://openhymnal.org/) four-part settings, all public domain. Settings with unclear copyright were left out.
- **Piano sound:** Salamander Grand Piano V3 by Alexander Holm, CC BY 3.0 (see `public/media/piano/CREDITS.txt`).

Regenerate the library with:

```sh
pip install mido
node scripts/music/hymn-events.cjs
python3 scripts/music/gen.py
```

`scripts/music/mutopia.json` sets each excerpt's start, pickup, bar count and tempo. `scripts/music/catalog.py` holds the titles and notes.

## Not done yet

- Favorites and progress are stored only in this browser; they are not part of the JSON backup yet.
- Music-room activity is not yet recorded in activity history.
- There is no support for a connected digital piano (Web MIDI); iPad Safari does not offer it.
