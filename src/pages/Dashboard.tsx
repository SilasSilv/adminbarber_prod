// ... existing dashboard content ...
  <div className="grid grid-cols-2 gap-3 mt-6">
    <StatCard
      title="Notificações pendentes"
      value={notifications.filter((n) => n.status === "pending").length}
      icon={<div className="h-5 w-5 text-primary">{/* ícone de sino */}</div>}
    />
    <StatCard
      title="Notificações enviadas"
      value={notifications.filter((n) => n.status === "sent").length}
      icon={<div className="h-5 w-5 text-success">{/* ícone de check */}</div>}
    />
    <StatCard
      title="Notificações falhas"
      value={notifications.filter((n) => n.status === "failed").length}
      icon={<div className="h-5 w-5 text-destructive">{/* ícone de alerta */}</div>}
    />
  </div>