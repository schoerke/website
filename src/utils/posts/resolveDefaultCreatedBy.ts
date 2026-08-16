import type { PayloadRequest } from 'payload'

interface ResolveDefaultCreatedByArgs {
  req: PayloadRequest
}

/**
 * Resolves the default "Created by" employee for a new post based on the logged-in user.
 * Matches req.user.email against the employees collection. Returns the employee id when the
 * logged-in user is an employee, otherwise undefined (no auto-selection).
 */
export const resolveDefaultCreatedBy = async ({ req }: ResolveDefaultCreatedByArgs): Promise<number | undefined> => {
  if (!req?.user?.email) return undefined
  const { docs } = await req.payload.find({
    collection: 'employees',
    where: { email: { equals: req.user.email } },
    limit: 1,
  })
  return docs[0]?.id
}
