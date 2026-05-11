import { cn } from "@/lib/utils";

interface Column {
  header: string;
  field: string;
}

interface TableProps {
  columns: Column[];
  data: any[];
}

export function Table({ columns, data }: TableProps) {
  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            {columns.map((col, i) => (
              <th key={i} className="text-left p-3 text-muted-foreground font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border/30 last:border-0">
              {columns.map((col, j) => {
                const value = row[col.field];
                return (
                  <td key={j} className={cn("p-3", col.field === "actions" && "text-right")}>
                    {typeof value === "function" ? null : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}