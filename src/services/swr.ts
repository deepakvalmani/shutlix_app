import useSWR from 'swr';
import api from './api';

export const fetcher = (url: string) => api.get(url).then(res => res.data.data);

export const useApi = (url: string | null, config = {}) => {
  return useSWR(url, fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    ...config
  });
};
