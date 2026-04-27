/* Skeleton loader primitives for Tixora */

export function SkeletonBox({ width = '100%', height = 16, radius = 'var(--r-sm)', style = {} }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

export function EventCardSkeleton() {
  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <SkeletonBox height={200} radius="0" />
      <div style={{ padding: '20px 20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
          <SkeletonBox width={72} height={22} />
          <SkeletonBox width={90} height={22} />
        </div>
        <SkeletonBox height={22} style={{ marginBottom: 8 }} />
        <SkeletonBox width="60%" height={16} style={{ marginBottom: 16 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonBox width="50%" height={14} />
          <SkeletonBox width="65%" height={14} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <SkeletonBox width={80} height={14} />
          <SkeletonBox width={70} height={14} />
        </div>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <SkeletonBox width={40} height={40} radius="var(--r)" />
        <SkeletonBox width={100} height={14} />
      </div>
      <SkeletonBox width={70} height={32} style={{ marginBottom: 6 }} />
      <SkeletonBox width={120} height={13} />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '14px 16px' }}>
          <SkeletonBox height={14} width={i === 0 ? '80%' : i === cols - 1 ? '60%' : '70%'} />
        </td>
      ))}
    </tr>
  );
}

export function TicketCardSkeleton() {
  return (
    <div className="card" style={{ overflow: 'hidden', padding: 0 }}>
      <SkeletonBox height={100} radius="0" />
      <div style={{ padding: 24 }}>
        <div className="grid-2 keep-2" style={{ gap: 12, marginBottom: 20 }}>
          {[0,1,2,3].map(i => (
            <div key={i}>
              <SkeletonBox width={60} height={12} style={{ marginBottom: 6 }} />
              <SkeletonBox width="80%" height={15} />
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
          <SkeletonBox width={160} height={160} radius="var(--r)" style={{ margin: '0 auto 8px' }} />
          <SkeletonBox width={200} height={12} style={{ margin: '0 auto' }} />
        </div>
      </div>
    </div>
  );
}
