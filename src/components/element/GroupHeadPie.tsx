import { useState } from 'react';

type Group = { name: string; quantity: number; products: { name: string; quantity: number }[] };
const colors = ['#a99aeb', '#80c9b4', '#8db8ee', '#efb698', '#e6ce81', '#dca7cd', '#91cdd7'];

export default function GroupHeadPie({ data }: { data: Group[] }) {
    const [selected, setSelected] = useState<string | null>(null);
    const total = data.reduce((sum, group) => sum + group.quantity, 0);
    if (!total) return <div className="group-pie-empty">No purchased products match these filters.</div>;
    const active = data.find((group) => group.name === selected) ?? data[0];
    let angle = -Math.PI / 2;
    const slices = data.map((group, index) => {
        const start = angle;
        angle += group.quantity / total * Math.PI * 2;
        // Two arcs also support a complete circle when there is only one group.
        const middle = (start + angle) / 2;
        const point = (a: number) => `${180 + 140 * Math.cos(a)},${100 + 68 * Math.sin(a)}`;
        return { group, color: colors[index % colors.length], path: `M180,100 L${point(start)} A140,68 0 0,1 ${point(middle)} A140,68 0 0,1 ${point(angle)} Z` };
    });
    return (
        <div className="group-pie">
            <svg viewBox="0 0 360 200" role="img" aria-label="Purchased quantity by product group head">
                <ellipse cx="180" cy="126" rx="135" ry="59" fill="#6d6494" opacity=".09" />
                {[14, 10, 6].map((depth) => <g key={depth} transform={`translate(0 ${depth})`} aria-hidden="true">
                    {slices.map(({ group, color, path }) => <path key={group.name} d={path} fill={color} style={{ filter: 'brightness(.80)' }} />)}
                </g>)}
                {slices.map(({ group, color, path }) => <path key={group.name} d={path} fill={color} stroke="#ffffffaa" strokeWidth="1.5"
                    className="group-pie-slice" style={{ opacity: active.name === group.name ? 1 : .8 }}
                    onMouseEnter={() => setSelected(group.name)} onClick={() => setSelected(group.name)}>
                    <title>{group.name}: {group.quantity} ({(group.quantity / total * 100).toFixed(1)}%) — {group.products.map((p) => `${p.name}: ${p.quantity}`).join(', ')}</title>
                </path>)}
            </svg>
            <div className="group-pie-legend" aria-label="Select a group head">
                {data.map((group, i) => <button key={group.name} type="button" aria-pressed={active.name === group.name}
                    onClick={() => setSelected(group.name)}>
                    <span className="group-pie-dot" style={{ background: colors[i % colors.length] }} />
                    <span>{group.name}</span><strong>{(group.quantity / total * 100).toFixed(1)}%</strong>
                </button>)}
            </div>
            <div className="group-pie-detail" aria-live="polite">
                <div><strong>{active.name}</strong><span>{active.quantity} quantity</span></div>
                {active.products.map((product) => <div key={product.name}><span>{product.name}</span><strong>{product.quantity}</strong></div>)}
            </div>
        </div>
    );
}
