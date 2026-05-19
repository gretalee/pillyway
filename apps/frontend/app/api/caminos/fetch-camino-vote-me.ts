const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface MyVote {
  vote: boolean;
}

export async function fetchMyVote(caminoId: string, token: string): Promise<MyVote | null> {
  const response = await fetch(`${API_URL}/caminos/${caminoId}/votes/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 404) return null;

  if (!response.ok) {
    throw Object.assign(new Error('Failed to fetch my vote'), { status: response.status });
  }

  return response.json() as Promise<MyVote>;
}
