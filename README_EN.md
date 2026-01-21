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

- **[Getting Started Guide](doc/developer/getting-started.md)** - Development environment setup, compilation, debugging
- **[Architecture Design Document](doc/developer/architecture.md)** - Plugin architecture, dependency injection, extensibility guide
- **[Architecture Review Report](ARCHITECTURE_REVIEW.md)** - Architecture quality assessment and improvement recommendations

### Project Structure

```text
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── plugins/             # Plugin system
│   │   ├── pluginManager.ts     # Plugin manager
│   │   ├── pluginInterface.ts    # Plugin interface
│   │   ├── pluginInitializer.ts # Plugin initializer
│   │   └── *.ts                 # Plugin implementations
│   ├── di/                  # Dependency injection
│   │   ├── container.ts          # DI container
│   │   └── initializer.ts       # DI initializer
│   ├── diagnostics/          # Diagnosis module
│   ├── formatters/           # Formatting module
│   ├── providers/            # Provider module
│   ├── commands/             # Command module
│   ├── config/               # Configuration management
│   ├── tools/               # Tool layer
│   └── utils/               # Utility functions
└── doc/
    ├── developer/            # Developer documentation
    └── user/                 # User documentation
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
