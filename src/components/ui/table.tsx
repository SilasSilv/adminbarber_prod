export function Table({ columns, data }: { columns: any[]; data: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.field} className="border-b border-border/50 p-3 text-left">
                {c.header}
              </th>
            ))}
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-border/30">
              {columns.map((c) => (
                <td key={c.field} className="p-3">
                  {c.field === "actions" ? (
                    <div className="flex space-x-2">
                      {row[c.field] as React.ReactNode}
                    </div>
                  ) : (
                    <span>{row[c.field]}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}