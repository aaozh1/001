import { describe, expect, it } from "vitest";
import { canSelectWinner, canSubmitQuote } from "@/lib/quote/logic";
import { rfqFlags } from "@/lib/spec/status";
import { parseDelimited } from "@/lib/import/parse";

// Regression tests for the platform-review round.

describe("canSubmitQuote — a settled deal can't be repriced", () => {
  it("allows quoting while the RFQ is live and the quote undecided", () => {
    expect(canSubmitQuote("open", null)).toBe(true);
    expect(canSubmitQuote("quoted", "submitted")).toBe(true);
  });
  it("blocks new/updated quotes once the RFQ closes or expires", () => {
    expect(canSubmitQuote("closed_won", null)).toBe(false);
    expect(canSubmitQuote("closed_won", "submitted")).toBe(false);
    expect(canSubmitQuote("closed_lost", "submitted")).toBe(false);
    expect(canSubmitQuote("expired", null)).toBe(false);
  });
  it("blocks repricing a decided quote even on a live RFQ", () => {
    expect(canSubmitQuote("quoted", "selected")).toBe(false);
    expect(canSubmitQuote("quoted", "rejected")).toBe(false);
  });
});

describe("canSelectWinner — no winner-flip on a closed RFQ", () => {
  it("selectable only while live", () => {
    expect(canSelectWinner("open")).toBe(true);
    expect(canSelectWinner("quoted")).toBe(true);
    expect(canSelectWinner("closed_won")).toBe(false);
    expect(canSelectWinner("closed_lost")).toBe(false);
    expect(canSelectWinner("expired")).toBe(false);
  });
});

describe("rfqFlags — a closed (won) line is not 'awaiting quotes'", () => {
  it("maps live states to sent/quoted", () => {
    expect(rfqFlags("sent")).toEqual({ hasSentRfq: true, hasQuote: false });
    expect(rfqFlags("quoted")).toEqual({ hasSentRfq: true, hasQuote: true });
  });
  it("closed and no-RFQ both fall through to material-based status", () => {
    expect(rfqFlags("closed")).toEqual({ hasSentRfq: false, hasQuote: false });
    expect(rfqFlags(undefined)).toEqual({ hasSentRfq: false, hasQuote: false });
  });
});

describe("parseDelimited — mid-cell inch marks stay literal", () => {
  it("keeps a stray quote inside a cell without swallowing the sheet", () => {
    const rows = parseDelimited('FL-01\tกระเบื้อง 12" แผ่นใหญ่\t22\nWL-01\tปูน\t5');
    expect(rows).toEqual([
      ["FL-01", 'กระเบื้อง 12" แผ่นใหญ่', "22"],
      ["WL-01", "ปูน", "5"],
    ]);
  });
  it("still honours properly quoted fields with embedded delimiters", () => {
    const rows = parseDelimited('"a,b",c\nd,e', ",");
    expect(rows).toEqual([
      ["a,b", "c"],
      ["d", "e"],
    ]);
  });
  it("still unescapes doubled quotes in quoted fields", () => {
    const rows = parseDelimited('"say ""hi""",x', ",");
    expect(rows).toEqual([['say "hi"', "x"]]);
  });
});
