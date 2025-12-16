import { describe, expect, it } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from './useHistory';

describe('useHistory', () => {
  it('pushState uses the latest present state when batched with setState', () => {
    const { result } = renderHook(() => useHistory({ count: 0 }));

    act(() => {
      result.current.setState({ count: 1 });
      result.current.pushState(prev => ({ count: prev.count + 1 }));
    });

    expect(result.current.state.count).toBe(2);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.state.count).toBe(1);
  });
});

