import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { addFavorite, listFavorites, removeFavorite } from './favorites.api';
import { getErrorMessage } from '../../lib/errors';

export function useFavorites() {
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ['favorites'],
    queryFn: listFavorites,
  });

  const favoriteIds = useMemo(
    () => new Set((favoritesQuery.data || []).map((item) => item.service_id)),
    [favoritesQuery.data],
  );

  const toggleMutation = useMutation({
    mutationFn: async ({ serviceId, currentlyFavorite }) => {
      if (currentlyFavorite) {
        await removeFavorite(serviceId);
      } else {
        await addFavorite(serviceId);
      }

      return { serviceId, currentlyFavorite };
    },
    onMutate: async ({ serviceId, currentlyFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['favorites'] });

      const previous = queryClient.getQueryData(['favorites']) || [];

      if (currentlyFavorite) {
        queryClient.setQueryData(
          ['favorites'],
          previous.filter((item) => item.service_id !== serviceId),
        );
      } else {
        queryClient.setQueryData(['favorites'], [
          {
            service_id: serviceId,
            created_at: new Date().toISOString(),
            service: null,
          },
          ...previous,
        ]);
      }

      return { previous };
    },
    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['favorites'], context.previous);
      }
      toast.error(getErrorMessage(error, 'Could not update favorites.'));
    },
    onSuccess: ({ currentlyFavorite }) => {
      toast.success(currentlyFavorite ? 'Removed from favorites.' : 'Added to favorites.');
    },
    onSettled: async (_data, _error, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['favorites'] }),
        queryClient.invalidateQueries({ queryKey: ['services'] }),
        queryClient.invalidateQueries({ queryKey: ['service', variables?.serviceId] }),
      ]);
    },
  });

  function isFavorite(serviceId) {
    return favoriteIds.has(serviceId);
  }

  function toggleFavorite(serviceId) {
    toggleMutation.mutate({
      serviceId,
      currentlyFavorite: isFavorite(serviceId),
    });
  }

  return {
    favoritesQuery,
    favoriteIds,
    isFavorite,
    toggleFavorite,
    isToggling: toggleMutation.isPending,
  };
}
