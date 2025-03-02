// frontend/src/tests/ContractWorkflow.test.tsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import configureStore from 'redux-mock-store';
import ContractWorkflow from '../components/contracts/ContractWorkflow';
import { createContract } from '../store/contract-slice';

// Mock Redux store
const mockStore = configureStore([]);

describe('Contract Workflow', () => {
  let store;

  beforeEach(() => {
    store = mockStore({
      auth: { user: { id: 'test-user-id' } },
      hashRate: { currentHashRate: 350 },
    });

    // Mock dispatch to track actions
    store.dispatch = jest.fn();
  });

  test('renders initial contract creation step', () => {
    render(
      <Provider store={store}>
        <ContractWorkflow />
      </Provider>
    );

    // Check for key elements in the first step
    expect(screen.getByText(/Create New Contract/i)).toBeInTheDocument();
    expect(screen.getByText(/Contract Details/i)).toBeInTheDocument();
  });

  test('creates a valid CALL contract', async () => {
    const mockContract = {
      contract_type: 'CALL',
      strike_hash_rate: 350,
      start_block_height: 800000,
      end_block_height: 802016,
      contract_size: 100000,
      premium: 5000,
    };

    // Mock the createContract action
    store.dispatch.mockReturnValue({
      type: createContract.fulfilled.type,
      payload: { ...mockContract, id: 'test-contract-id' },
    });

    render(
      <Provider store={store}>
        <ContractWorkflow />
      </Provider>
    );

    // Fill out contract details (simplified)
    fireEvent.change(screen.getByLabelText(/Strike Hash Rate/i), { 
      target: { value: '350' } 
    });

    fireEvent.click(screen.getByText(/Create Contract/i));

    // Wait for contract creation
    await waitFor(() => {
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: createContract.pending.type,
        })
      );
    });
  });
});

// Redux Slice Test
describe('Contract Slice', () => {
  test('creates a contract successfully', () => {
    const initialState = {
      contracts: [],
      loading: false,
      error: null,
    };

    const mockContract = {
      id: 'test-contract-id',
      contract_type: 'CALL',
      strike_hash_rate: 350,
    };

    const nextState = contractSlice.reducer(
      initialState, 
      createContract.fulfilled(mockContract, '')
    );

    expect(nextState.contracts).toHaveLength(1);
    expect(nextState.contracts[0].id).toBe('test-contract-id');
  });
});
