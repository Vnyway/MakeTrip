import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listCities, listCountries } from './geo.api';

export function useGeoDictionaries() {
  const countriesQuery = useQuery({
    queryKey: ['geo', 'countries'],
    queryFn: listCountries,
  });

  const citiesQuery = useQuery({
    queryKey: ['geo', 'cities', 'all'],
    queryFn: () => listCities(),
  });

  const countryNameById = useMemo(
    () => Object.fromEntries((countriesQuery.data || []).map((country) => [Number(country.id), country.name])),
    [countriesQuery.data],
  );
  const cityNameById = useMemo(
    () => Object.fromEntries((citiesQuery.data || []).map((city) => [Number(city.id), city.name])),
    [citiesQuery.data],
  );

  function getCountryName(countryId) {
    return countryNameById[Number(countryId)] || `Country #${countryId}`;
  }

  function getCityName(cityId) {
    return cityNameById[Number(cityId)] || `City #${cityId}`;
  }

  return {
    getCountryName,
    getCityName,
    isLoading: countriesQuery.isLoading || citiesQuery.isLoading,
  };
}

