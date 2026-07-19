import "server-only";
import ExcelJS from "exceljs";

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value && typeof value.text === "string") return value.text;
    if ("result" in value) return String(value.result ?? "");
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((r) => r.text).join("");
    }
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return "";
  }
  return String(value);
}

/** First worksheet of an .xlsx as a string grid. */
export async function xlsxToRows(buffer: Buffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  // exceljs's typed Buffer param drifts from our @types/node Buffer; runtime is fine.
  await wb.xlsx.load(buffer as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    // colCount can be 0 for sparse rows; walk to the row's last used column.
    const last = row.cellCount || row.actualCellCount;
    for (let c = 1; c <= last; c++) cells.push(cellText(row.getCell(c).value));
    if (cells.some((v) => v.trim() !== "")) rows.push(cells);
  });
  return rows;
}
