import { promises as fs } from "fs";
import path from "path";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

// Renders a legal DRAFT from docs/legal/*.md with a minimal, dependency-free
// markdown pass (headings, tables, lists, blockquote). The .md files stay the
// single source the lawyer edits; this page just mirrors them.

function renderInline(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let inList = false;

  const closeList = () => {
    if (inList) {
      out.push("</ul>");
      inList = false;
    }
  };
  const closeTable = () => {
    if (inTable) {
      out.push("</tbody></table></div>");
      inTable = false;
    }
  };

  for (const line of lines) {
    const t = line.trimEnd();
    if (t.startsWith("|")) {
      closeList();
      const cells = t.split("|").slice(1, -1).map((c) => c.trim());
      if (cells.every((c) => /^-+$/.test(c))) continue; // separator row
      if (!inTable) {
        out.push(
          '<div class="overflow-x-auto"><table class="my-3 w-full min-w-[480px] border border-line text-sm"><tbody>',
        );
        inTable = true;
      }
      out.push(
        `<tr class="border-b border-line last:border-0">${cells
          .map((c) => `<td class="border-r border-line px-3 py-1.5 align-top last:border-0">${renderInline(c)}</td>`)
          .join("")}</tr>`,
      );
      continue;
    }
    closeTable();

    if (t.startsWith("# ")) {
      closeList();
      out.push(`<h1 class="mt-2 text-2xl font-bold text-ink">${renderInline(t.slice(2))}</h1>`);
    } else if (t.startsWith("## ")) {
      closeList();
      out.push(`<h2 class="mt-6 text-lg font-semibold text-ink">${renderInline(t.slice(3))}</h2>`);
    } else if (t.startsWith("> ")) {
      closeList();
      out.push(
        `<blockquote class="my-3 rounded-card border border-warn/40 bg-warn-soft p-3 text-sm text-ink">${renderInline(t.slice(2))}</blockquote>`,
      );
    } else if (/^[-•] |^\d+\. /.test(t)) {
      if (!inList) {
        out.push('<ul class="my-2 list-disc pl-6 text-sm text-sub">');
        inList = true;
      }
      out.push(`<li class="my-1">${renderInline(t.replace(/^[-•] |^\d+\. /, ""))}</li>`);
    } else if (t === "") {
      closeList();
    } else {
      closeList();
      out.push(`<p class="my-2 text-sm text-sub">${renderInline(t)}</p>`);
    }
  }
  closeList();
  closeTable();
  return out.join("\n");
}

export async function LegalDoc({ file }: { file: string }) {
  const t = await getTranslations("legal");
  const md = await fs.readFile(path.join(process.cwd(), "docs/legal", file), "utf8");

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link href="/" className="text-sm text-sub hover:text-ink">
        ← {t("backHome")}
      </Link>
      <div className="mt-3 rounded-card border border-line bg-surface p-6 shadow-soft">
        <p className="mb-4 rounded-pill border border-warn/50 bg-warn-soft px-3 py-1.5 text-center text-xs font-semibold text-ink">
          ⚠️ {t("draftBanner")}
        </p>
        {/* Content comes from our own repo files, rendered through the escaping pass above. */}
        <div dangerouslySetInnerHTML={{ __html: mdToHtml(md) }} />
      </div>
    </div>
  );
}
