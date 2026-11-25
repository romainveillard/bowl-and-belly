/** A chart's figures as a table, for screen readers, which can't read the drawing. */
export function ChartTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  /** The first cell heads its row, such as the day. */
  rows: { key: string; cells: string[] }[];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ key, cells: [heading, ...values] }) => (
          <tr key={key}>
            <th scope="row">{heading}</th>
            {values.map((value, index) => (
              <td key={columns[index + 1]}>{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
