/**
 * ESLint Security Configuration
 * PDF Transaction Extractor - Security-focused linting rules
 */

module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:security/recommended'
  ],
  plugins: [
    'security'
  ],
  env: {
    browser: true,
    node: true,
    es6: true,
    jest: true
  },
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  rules: {
    // Security rules
    'security/detect-object-injection': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-pseudoRandomBytes': 'error',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-new-buffer': 'error',
    
    // XSS Prevention
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // SQL Injection Prevention
    'no-eval': 'error',
    
    // General security best practices
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'error',
    'no-unreachable': 'error',
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    
    // Input validation
    'no-implicit-coercion': 'error',
    'no-implicit-globals': 'error',
    
    // File system security
    'no-path-concat': 'error',
    
    // HTTP security
    'no-mixed-spaces-and-tabs': 'error',
    
    // Strict mode enforcement
    'strict': ['error', 'global'],
    
    // Variable declarations
    'no-undef': 'error',
    'no-redeclare': 'error',
    
    // Function security
    'no-caller': 'error',
    'no-extend-native': 'error',
    
    // Type safety
    'valid-typeof': 'error',
    'use-isnan': 'error',
    
    // Error handling
    'no-empty-catch': 'error',
    
    // DOM security
    'no-inner-declarations': 'error',
    
    // Prototype pollution prevention
    'no-prototype-builtins': 'error',
    
    // Regular expression security
    'no-control-regex': 'error',
    'no-invalid-regexp': 'error',
    
    // Dangerous patterns
    'no-delete-var': 'error',
    'no-global-assign': 'error',
    'no-implicit-coercion': 'error',
    
    // API security
    'no-new-wrappers': 'error',
    'no-octal': 'error',
    'no-octal-escape': 'error',
    
    // Memory leaks prevention
    'no-unused-expressions': 'error',
    
    // Content Security Policy related
    'no-unsanitized/method': 'off', // We'll use a separate plugin for this
    'no-unsanitized/property': 'off'
  },
  overrides: [
    {
      // Test files can be more lenient
      files: ['**/*.test.js', '**/*.spec.js', '**/tests/**/*.js'],
      rules: {
        'no-console': 'off',
        'security/detect-object-injection': 'warn',
        'security/detect-non-literal-regexp': 'warn'
      }
    },
    {
      // Configuration files
      files: ['**/*.config.js', '**/.*.js'],
      env: {
        node: true
      },
      rules: {
        'security/detect-child-process': 'off'
      }
    },
    {
      // Development scripts
      files: ['scripts/**/*.js', 'tools/**/*.js'],
      rules: {
        'no-console': 'off',
        'security/detect-child-process': 'off'
      }
    }
  ],
  settings: {
    // Custom settings for security rules
    security: {
      // Whitelist safe functions if needed
      allowedMethods: [
        'sanitize',
        'escape',
        'validator.isEmail',
        'validator.isURL'
      ]
    }
  },
  // Ignore patterns for security scanning
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '*.min.js',
    'vendor/',
    'third-party/',
    'ms-playwright/',
    'test-results/',
    'playwright-report/'
  ]
};