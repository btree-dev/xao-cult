import apiClient from './ApiClient';
import { IContract } from './types/api';

export class ContractAPI {
  private endpoint = '/contracts';

  async createContract(contractData: Partial<IContract>): Promise<string> {
    const response = await apiClient.post<{ success: boolean; data: { id: string } }>(
      this.endpoint,
      contractData
    );
    return response.data.data.id;
  }

  async getAllContracts(): Promise<IContract[]> {
    const response = await apiClient.get<{ success: boolean; data: IContract[] }>(this.endpoint);
    return response.data.data;
  }

  async getContractById(id: string): Promise<IContract | null> {
    const response = await apiClient.get<{ success: boolean; data: IContract }>(`${this.endpoint}/${id}`);
    return response.data.data;
  }
}

export const contractAPI = new ContractAPI();