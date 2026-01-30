# Shell Formatter

> Intelligent Shell script formatting and checking tool based on shfmt and shellcheck

**中文版**: [README_CN.md](README.md)

## Quick Start for Developers

### Project Overview

Shell Formatter is a VSCode extension that provides Shell script formatting and diagnosis features. It adopts a plugin-based architecture with dependency injection, supporting dynamic plugin loading, performance monitoring, and configuration-driven plugin activation.

### Core Features

- **Formatting** - Automatically format Shell scripts with shfmt
- **Diagnosis** - Detect syntax and semantic errors with shellcheck and shfmt
- **Automatic Diagnosis** - Automatic checking when opening, saving, or editing (300ms debounce)
- **Plugin System** - Support for dynamic plugin activation/deactivation with configuration
- **Performance Monitoring** - Built-in performance metrics collection and reporting

### Developer Documentation

For detailed technical documentation, see [doc/developer/](doc/developer/):

- **[Developer Handbook](doc/developer/00-handbook.md)** - Developer documentation overview
- **[Setup](doc/developer/01-setup.md)** - Development environment setup
- **[Development Workflow](doc/developer/02-development-workflow.md)** - Development workflow guide
- **[Project Layout](doc/developer/03-project-layout.md)** - Project structure description
- **[Configuration Reference](doc/developer/04-configuration-reference.md)** - Configuration options details
- **[Architecture Design](doc/developer/05-architecture.md)** - Plugin architecture, dependency injection
- **[Plugin System](doc/developer/06-plugin-system.md)** - Plugin development guide
- **[Observability](doc/developer/07-observability.md)** - Performance monitoring and logging
- **[Testing](doc/developer/08-testing.md)** - Unit tests and integration tests

### Project Structure

```text
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── adapters/             # Adapter layer
│   ├── commands/             # Command module
│   ├── config/               # Configuration management
│   ├── di/                  # Dependency injection
│   ├── diagnostics/          # Diagnosis module
│   ├── formatters/           # Formatting module
│   ├── metrics/             # Performance metrics
│   ├── plugins/             # Plugin system
│   ├── providers/            # Provider module
│   ├── tools/               # Tool layer
│   │   ├── executor/             # Executor
│   │   └── shell/                # Shell tools
│   └── utils/               # Utility functions
│       ├── performance/         # Performance monitoring utilities
│       └── plugin/              # Plugin utilities
├── doc/
│   ├── developer/            # Developer documentation
│   ├── tools/                # Tools documentation
│   ├── versions/             # Version documentation
│   └── vscode/               # VSCode documentation
├── test/                    # Test files
├── scripts/                 # Build scripts
├── resources/               # Resource files
├── dist/                    # Compiled output
├── coverage/                # Test coverage
├── .eslintrc.js            # ESLint configuration
├── jest.config.js          # Jest configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Project configuration
├── .vscodeignore           # VSCode ignore configuration
├── .gitignore              # Git ignore configuration
└── .markdownlintrc.json    # Markdown Lint configuration
```

### Technical Architecture

- **Plugin Architecture** - IFormatPlugin interface supporting dynamic loading and configuration
- **Dependency Injection** - Lightweight DI container with circular dependency detection
- **Singleton Management** - PluginManager, PerformanceMonitor, and other global singletons
- **Configuration Caching** - Configuration snapshot and automatic invalidation via SettingInfo
- **Performance Optimization** - Parallel plugin activation (40% improvement), debounce mechanism
- **Adapter Pattern** - Tool results converted to VSCode diagnostics

### Quick Start

```bash
# Install dependencies
npm install

# Watch mode compilation
npm run watch

# Debug
# Press F5 to start VSCode Extension Development Host
```

For more details, refer to the [Getting Started Guide](doc/developer/getting-started.md).

### User Documentation

For end-user documentation, see [doc/user/README.md](doc/user/README.md):

- **Configuration Options** - Complete configuration description (Chinese and English)
- **Usage Methods** - Formatting, quick fixes, and other operation guides
- **FAQ** - Troubleshooting and common questions

---

## System Requirements

- **Node.js** >= 16.x
- **npm** >= 8.x
- **TypeScript** >= 5.0
- **VSCode** >= 1.74.0

## Links

- [GitHub](https://github.com/bdq460/shell-formatter)
- [Issues](https://github.com/bdq460/shell-formatter/issues)
- [License](LICENSE)

## Acknowledgments

Thanks to the following open source tools:

- [shfmt](https://github.com/mvdan/sh) - Shell script formatting tool
- [shellcheck](https://github.com/koalaman/shellcheck) - Shell script static analysis tool
