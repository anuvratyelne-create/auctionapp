/**
 * Transaction utility for Supabase operations
 * Since Supabase doesn't support true transactions in the same way as traditional DBs,
 * we use a manual rollback pattern to ensure consistency.
 */

type RollbackAction = () => Promise<void>;

interface TransactionContext {
  rollbackStack: RollbackAction[];
  addRollback: (action: RollbackAction) => void;
}

/**
 * Execute a series of operations with automatic rollback on failure.
 *
 * Usage:
 * ```
 * const result = await withRollback(async (ctx) => {
 *   const user = await createUser(data);
 *   ctx.addRollback(async () => {
 *     await supabase.from('users').delete().eq('id', user.id);
 *   });
 *
 *   const tournament = await createTournament(user.id);
 *   ctx.addRollback(async () => {
 *     await supabase.from('tournaments').delete().eq('id', tournament.id);
 *   });
 *
 *   return { user, tournament };
 * });
 * ```
 */
export async function withRollback<T>(
  operation: (ctx: TransactionContext) => Promise<T>
): Promise<T> {
  const rollbackStack: RollbackAction[] = [];

  const ctx: TransactionContext = {
    rollbackStack,
    addRollback: (action: RollbackAction) => {
      rollbackStack.push(action);
    }
  };

  try {
    return await operation(ctx);
  } catch (error) {
    // Execute rollbacks in reverse order (LIFO)
    for (const rollback of rollbackStack.reverse()) {
      try {
        await rollback();
      } catch (rollbackError) {
        // Log rollback errors but continue with remaining rollbacks
        console.error('Rollback action failed:', rollbackError);
      }
    }
    throw error;
  }
}

/**
 * Create a tracked resource that will be automatically cleaned up on error.
 * Returns a tuple of [resource, cleanup function].
 */
export function createTrackedResource<T extends { id: string }>(
  ctx: TransactionContext,
  resource: T,
  cleanup: (id: string) => Promise<void>
): T {
  ctx.addRollback(async () => {
    await cleanup(resource.id);
  });
  return resource;
}
