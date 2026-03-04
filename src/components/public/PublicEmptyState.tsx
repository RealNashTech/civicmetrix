interface PublicEmptyStateProps {
  message: string
}

export default function PublicEmptyState({ message }: PublicEmptyStateProps) {
  return (
    <p className="text-gray-500">
      {message}
    </p>
  )
}
