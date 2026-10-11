import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import abcjs from "abcjs";
import repertoire from "../src/content/repertoire.json";
import { choicesFor, melodyOf, type Excerpt } from "../src/music/repertoire";
import { NameThatPiece } from "../src/music/NameThatPiece";
import { freshProgress } from "../src/music/progress";

const pieces = repertoire as unknown as Excerpt[];

describe("repertoire", () => {
  it("has a broad, attributed public-domain library", () => {
    expect(pieces.length).toBeGreaterThanOrEqual(60);
    for (const f of ["classical", "ragtime", "hymn"])
      expect(pieces.filter((p) => p.family === f).length).toBeGreaterThan(10);
    expect(new Set(pieces.map((p) => p.id)).size).toBe(pieces.length);
    for (const p of pieces) {
      expect(p.title && p.composer && p.note && p.work).toBeTruthy();
      expect(p.source.license).toBe("Public domain");
    }
  });

  it("every excerpt parses as music and its notes fit inside the excerpt", () => {
    for (const p of pieces) {
      const [tune] = abcjs.parseOnly(p.abc);
      expect(tune.warnings ?? [], p.id).toEqual([]);
      expect(p.events.length, p.id).toBeGreaterThan(8);
      for (const [at, beats, midi] of p.events) {
        expect(at).toBeGreaterThanOrEqual(0);
        expect(at + beats).toBeLessThanOrEqual(p.beats + 1e-6);
        expect(midi).toBeGreaterThanOrEqual(21);
        expect(midi).toBeLessThanOrEqual(108);
      }
      expect(melodyOf(p).length, p.id).toBeGreaterThan(4);
    }
  });

  it("offers four distinct titles including the answer", () => {
    for (const p of pieces.slice(0, 20)) {
      const choices = choicesFor(p, pieces);
      expect(choices).toHaveLength(4);
      expect(choices.map((c) => c.id)).toContain(p.id);
      expect(new Set(choices.map((c) => c.title)).size).toBe(4);
    }
  });
});

describe("Name that piece", () => {
  const player = {
    play: vi.fn(async () => {}),
    stop: vi.fn(),
    beat: -1,
    playingId: null,
    ready: "piano" as const,
  };

  it("reveals the piece, its composer and a note after a choice", () => {
    const progress = { ...freshProgress(), family: "ragtime" as const };
    const onProgress = vi.fn();
    render(
      <NameThatPiece
        pieces={pieces}
        progress={progress}
        onProgress={onProgress}
        player={player}
        onPlayYourself={() => {}}
      />,
    );
    const choices = screen
      .getAllByRole("button")
      .filter((b) => b.closest(".ntp-choices"));
    expect(choices).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Play the excerpt" }));
    expect(player.play).toHaveBeenCalled();
    fireEvent.click(choices[0]);
    expect(screen.getByText(/that’s it|Not that one/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Play it yourself" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Mutopia Project" }),
    ).toBeInTheDocument();
  });

  it("can be played without choices: think of the name, then reveal", () => {
    render(
      <NameThatPiece
        pieces={pieces}
        progress={{ ...freshProgress(), answer: "reveal", family: "hymn" }}
        onProgress={() => {}}
        player={player}
        onPlayYourself={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "A clue, please" }));
    expect(screen.getByText(/Era and style/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reveal the piece" }));
    expect(
      screen.getByRole("button", { name: "Next piece →" }),
    ).toBeInTheDocument();
  });
});
