interface PublicGrantCardProps {
  grant: {
    id: string
    name: string
    amount?: number | null
  }
}

export default function PublicGrantCard({ grant }: PublicGrantCardProps) {
  return (
    <div className="border rounded-lg p-5 space-y-2">
      <h2 className="text-lg font-medium">
        {grant.name}
      </h2>

      {grant.amount && (
        <p className="text-sm text-gray-600">
          Amount: ${grant.amount.toLocaleString()}
        </p>
      )}
    </div>
  )
}
