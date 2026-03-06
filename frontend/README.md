# Frontend

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.1.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

### Aviso "GLIBCXX_3.4.29 not found" / "Unable to initialize JavaScript cache storage"

Se aparecer o aviso sobre `libstdc++.so.6: version GLIBCXX_3.4.29 not found` ou "Unable to initialize JavaScript cache storage", ele **não afeta o resultado do build** — apenas o cache do compilador Angular deixa de ser usado (builds podem ser um pouco mais lentos). O cache em disco já está desativado em `angular.json` (`cli.cache.enabled: false`).

Para eliminar o aviso (opcional), é preciso que o sistema tenha uma libstdc++ com `GLIBCXX_3.4.29`. Em RHEL/CentOS/Rocky 8, instale o gcc-toolset-11 e rode o build no ambiente do toolset:

```bash
# Instalar (requer root)
sudo dnf install gcc-toolset-11

# Rodar o build com a libstdc++ do toolset
scl enable gcc-toolset-11 -- npm run build
```

Se não usar o toolset, o aviso pode ser ignorado com segurança.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
