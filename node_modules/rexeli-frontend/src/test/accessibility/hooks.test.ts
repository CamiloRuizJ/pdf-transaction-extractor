import { renderHook, act } from '@testing-library/react';
import {
  useFocusManagement,
  useScreenReaderAnnouncements,
  useHighContrast,
  useReducedMotion,
  useAccessibleForm,
  useColorContrast,
  useARIA,
} from '../../hooks/useAccessibility';

// Mock DOM methods
beforeEach(() => {
  // Mock focus method
  HTMLElement.prototype.focus = jest.fn();
  
  // Mock addEventListener and removeEventListener
  Element.prototype.addEventListener = jest.fn();
  Element.prototype.removeEventListener = jest.fn();
  
  // Mock querySelectorAll
  Element.prototype.querySelectorAll = jest.fn().mockReturnValue([]);
  
  // Mock scrollIntoView
  Element.prototype.scrollIntoView = jest.fn();
  
  // Mock document.body methods
  document.body.appendChild = jest.fn();
  document.body.removeChild = jest.fn();
  document.body.contains = jest.fn().mockReturnValue(true);
});

describe('Accessibility Hooks', () => {
  describe('useFocusManagement', () => {
    it('should identify focusable elements correctly', () => {
      const { result } = renderHook(() => useFocusManagement());
      
      // Mock container with focusable elements
      const mockContainer = document.createElement('div');
      const button = document.createElement('button');
      const input = document.createElement('input');
      const disabledButton = document.createElement('button');
      disabledButton.disabled = true;
      
      mockContainer.appendChild(button);
      mockContainer.appendChild(input);
      mockContainer.appendChild(disabledButton);
      
      // Mock querySelectorAll to return our elements
      mockContainer.querySelectorAll = jest.fn().mockReturnValue([button, input, disabledButton]);
      
      const focusableElements = result.current.getFocusableElements(mockContainer);
      
      // Should exclude disabled elements
      expect(mockContainer.querySelectorAll).toHaveBeenCalledWith(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
      );
    });

    it('should trap focus within container', () => {
      const { result } = renderHook(() => useFocusManagement());
      
      const mockContainer = document.createElement('div');
      const firstButton = document.createElement('button');
      const lastButton = document.createElement('button');
      
      firstButton.textContent = 'First';
      lastButton.textContent = 'Last';
      
      mockContainer.appendChild(firstButton);
      mockContainer.appendChild(lastButton);
      
      // Mock querySelectorAll to return our buttons
      mockContainer.querySelectorAll = jest.fn().mockReturnValue([firstButton, lastButton]);
      
      const cleanup = result.current.trapFocus(mockContainer);
      
      expect(mockContainer.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(firstButton.focus).toHaveBeenCalled();
      
      // Test cleanup
      cleanup();
      expect(mockContainer.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('should restore focus to previous element', () => {
      const { result } = renderHook(() => useFocusManagement());
      
      const mockElement = document.createElement('button');
      mockElement.focus = jest.fn();
      
      result.current.restoreFocus(mockElement);
      
      expect(mockElement.focus).toHaveBeenCalled();
    });

    it('should handle missing focus method gracefully', () => {
      const { result } = renderHook(() => useFocusManagement());
      
      const mockElement = {} as HTMLElement;
      
      expect(() => {
        result.current.restoreFocus(mockElement);
      }).not.toThrow();
    });
  });

  describe('useScreenReaderAnnouncements', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should announce messages to screen readers', () => {
      const { result } = renderHook(() => useScreenReaderAnnouncements());
      
      act(() => {
        result.current.announce('Test announcement');
      });

      expect(document.body.appendChild).toHaveBeenCalled();
      
      // Fast forward time to trigger cleanup
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(document.body.removeChild).toHaveBeenCalled();
    });

    it('should handle different priority levels', () => {
      const { result } = renderHook(() => useScreenReaderAnnouncements());
      
      act(() => {
        result.current.announce('Urgent message', 'assertive');
      });

      // Should have called appendChild with an element that has aria-live="assertive"
      expect(document.body.appendChild).toHaveBeenCalled();
      
      const addedElement = (document.body.appendChild as jest.Mock).mock.calls[0][0];
      expect(addedElement.getAttribute('aria-live')).toBe('assertive');
    });

    it('should clear all announcements', () => {
      const { result } = renderHook(() => useScreenReaderAnnouncements());
      
      act(() => {
        result.current.announce('First announcement');
        result.current.announce('Second announcement');
      });

      expect(result.current.announcements).toHaveLength(2);

      act(() => {
        result.current.clearAnnouncements();
      });

      expect(result.current.announcements).toHaveLength(0);
    });

    it('should provide LiveRegion component', () => {
      const { result } = renderHook(() => useScreenReaderAnnouncements());
      
      act(() => {
        result.current.announce('Test message');
      });

      const LiveRegion = result.current.LiveRegion;
      expect(LiveRegion).toBeDefined();
      expect(typeof LiveRegion).toBe('function');
    });

    it('should handle missing document.body gracefully', () => {
      // Temporarily remove document.body
      const originalAppendChild = document.body.appendChild;
      document.body.appendChild = jest.fn().mockImplementation(() => {
        throw new Error('No body');
      });

      const { result } = renderHook(() => useScreenReaderAnnouncements());

      expect(() => {
        act(() => {
          result.current.announce('Test message');
        });
      }).not.toThrow();

      // Restore
      document.body.appendChild = originalAppendChild;
    });
  });

  describe('useHighContrast', () => {
    beforeEach(() => {
      // Mock matchMedia
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: false,
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });
    });

    it('should detect high contrast mode', () => {
      // Mock high contrast detection
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(-ms-high-contrast: active)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { result } = renderHook(() => useHighContrast());
      expect(result.current).toBe(true);
    });

    it('should detect prefers-contrast setting', () => {
      (window.matchMedia as jest.Mock).mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));

      const { result } = renderHook(() => useHighContrast());
      expect(result.current).toBe(true);
    });

    it('should return false when no high contrast detected', () => {
      const { result } = renderHook(() => useHighContrast());
      expect(result.current).toBe(false);
    });

    it('should clean up event listeners on unmount', () => {
      const mockRemoveEventListener = jest.fn();
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: mockRemoveEventListener,
      });

      const { unmount } = renderHook(() => useHighContrast());
      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledTimes(2); // Two media queries
    });
  });

  describe('useReducedMotion', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        })),
      });
    });

    it('should detect reduced motion preference', () => {
      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(true);
    });

    it('should return false when no reduced motion preference', () => {
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(false);
    });

    it('should update when preference changes', () => {
      let changeHandler: (e: MediaQueryListEvent) => void;
      
      (window.matchMedia as jest.Mock).mockReturnValue({
        matches: false,
        addEventListener: jest.fn().mockImplementation((event, handler) => {
          if (event === 'change') {
            changeHandler = handler;
          }
        }),
        removeEventListener: jest.fn(),
      });

      const { result } = renderHook(() => useReducedMotion());
      expect(result.current).toBe(false);

      // Simulate preference change
      act(() => {
        changeHandler({ matches: true } as MediaQueryListEvent);
      });

      expect(result.current).toBe(true);
    });
  });

  describe('useAccessibleForm', () => {
    it('should manage form validation errors', () => {
      const { result } = renderHook(() => useAccessibleForm());

      act(() => {
        result.current.setFieldError('email', 'Invalid email format');
      });

      expect(result.current.errors).toEqual({ email: 'Invalid email format' });
    });

    it('should clear field errors', () => {
      const { result } = renderHook(() => useAccessibleForm());

      act(() => {
        result.current.setFieldError('email', 'Invalid email');
        result.current.setFieldError('password', 'Too short');
      });

      expect(Object.keys(result.current.errors)).toHaveLength(2);

      act(() => {
        result.current.clearFieldError('email');
      });

      expect(result.current.errors).toEqual({ password: 'Too short' });
    });

    it('should validate fields with multiple validators', () => {
      const { result } = renderHook(() => useAccessibleForm());

      const validators = [
        (value: string) => value ? null : 'Required',
        (value: string) => value.length >= 6 ? null : 'Minimum 6 characters',
      ];

      // Should fail first validator
      act(() => {
        const isValid = result.current.validateField('password', '', validators);
        expect(isValid).toBe(false);
      });

      expect(result.current.errors.password).toBe('Required');

      // Should fail second validator
      act(() => {
        const isValid = result.current.validateField('password', 'abc', validators);
        expect(isValid).toBe(false);
      });

      expect(result.current.errors.password).toBe('Minimum 6 characters');

      // Should pass all validators
      act(() => {
        const isValid = result.current.validateField('password', 'password123', validators);
        expect(isValid).toBe(true);
      });

      expect(result.current.errors.password).toBeUndefined();
    });

    it('should provide correct field props', () => {
      const { result } = renderHook(() => useAccessibleForm());

      act(() => {
        result.current.setFieldError('email', 'Invalid email');
      });

      const fieldProps = result.current.getFieldProps('email');
      expect(fieldProps['aria-invalid']).toBe('true');
      expect(fieldProps['aria-describedby']).toBe('email-error');

      const validFieldProps = result.current.getFieldProps('username');
      expect(validFieldProps['aria-invalid']).toBe('false');
      expect(validFieldProps['aria-describedby']).toBeUndefined();
    });

    it('should provide correct error props', () => {
      const { result } = renderHook(() => useAccessibleForm());

      const errorProps = result.current.getErrorProps('email');
      expect(errorProps).toEqual({
        id: 'email-error',
        role: 'alert',
        'aria-live': 'polite',
      });
    });
  });

  describe('useColorContrast', () => {
    it('should calculate color contrast ratio', () => {
      const { result } = renderHook(() => useColorContrast());

      // Test with high contrast colors (black on white)
      const highContrast = result.current.calculateContrast('#000000', '#ffffff');
      expect(highContrast).toBeGreaterThan(10); // Should be ~21

      // Test with low contrast colors
      const lowContrast = result.current.calculateContrast('#777777', '#888888');
      expect(lowContrast).toBeLessThan(5);
    });

    it('should check WCAG AA compliance', () => {
      const { result } = renderHook(() => useColorContrast());

      // High contrast should meet AA
      expect(result.current.meetsWCAG('#000000', '#ffffff', 'AA')).toBe(true);
      
      // Low contrast should not meet AA
      expect(result.current.meetsWCAG('#aaaaaa', '#bbbbbb', 'AA')).toBe(false);
    });

    it('should check WCAG AAA compliance', () => {
      const { result } = renderHook(() => useColorContrast());

      // Very high contrast should meet AAA
      expect(result.current.meetsWCAG('#000000', '#ffffff', 'AAA')).toBe(true);
      
      // Medium contrast might meet AA but not AAA
      expect(result.current.meetsWCAG('#555555', '#ffffff', 'AAA')).toBe(false);
    });

    it('should handle invalid color formats gracefully', () => {
      const { result } = renderHook(() => useColorContrast());

      expect(() => {
        result.current.calculateContrast('invalid', '#ffffff');
      }).not.toThrow();

      // Should return a reasonable default
      const contrast = result.current.calculateContrast('invalid', '#ffffff');
      expect(typeof contrast).toBe('number');
    });
  });

  describe('useARIA', () => {
    it('should set ARIA attributes', () => {
      const { result } = renderHook(() => useARIA());

      act(() => {
        result.current.setARIA('label', 'Button label');
        result.current.setARIA('expanded', true);
        result.current.setARIA('level', 2);
      });

      const ariaProps = result.current.getARIAProps();
      expect(ariaProps).toEqual({
        'aria-label': 'Button label',
        'aria-expanded': 'true',
        'aria-level': '2',
      });
    });

    it('should remove ARIA attributes', () => {
      const { result } = renderHook(() => useARIA());

      act(() => {
        result.current.setARIA('label', 'Button label');
        result.current.setARIA('expanded', false);
      });

      expect(result.current.getARIAProps()['aria-label']).toBe('Button label');

      act(() => {
        result.current.removeARIA('label');
      });

      const ariaProps = result.current.getARIAProps();
      expect(ariaProps['aria-label']).toBeUndefined();
      expect(ariaProps['aria-expanded']).toBe('false'); // Should still be there
    });

    it('should convert values to strings', () => {
      const { result } = renderHook(() => useARIA());

      act(() => {
        result.current.setARIA('level', 3);
        result.current.setARIA('expanded', false);
        result.current.setARIA('required', true);
      });

      const ariaProps = result.current.getARIAProps();
      expect(ariaProps['aria-level']).toBe('3');
      expect(ariaProps['aria-expanded']).toBe('false');
      expect(ariaProps['aria-required']).toBe('true');
    });

    it('should handle empty state', () => {
      const { result } = renderHook(() => useARIA());

      const ariaProps = result.current.getARIAProps();
      expect(ariaProps).toEqual({});
    });

    it('should handle removing non-existent attributes', () => {
      const { result } = renderHook(() => useARIA());

      expect(() => {
        act(() => {
          result.current.removeARIA('non-existent');
        });
      }).not.toThrow();

      const ariaProps = result.current.getARIAProps();
      expect(ariaProps).toEqual({});
    });
  });
});