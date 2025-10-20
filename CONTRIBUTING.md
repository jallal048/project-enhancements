# 🚀 Guía de Contribución Avanzada

¡Bienvenido/a al proyecto! Esta guía te ayudará a contribuir de manera efectiva y profesional.

## 📋 Índice
- [Configuración Inicial](#-configuración-inicial)
- [Flujo de Trabajo](#-flujo-de-trabajo)
- [Estándares de Código](#-estándares-de-código)
- [Testing](#-testing)
- [Documentación](#-documentación)
- [Pull Requests](#-pull-requests)
- [Issues](#-issues)
- [Comunicación](#-comunicación)

## 🔧 Configuración Inicial

### Prerrequisitos
Antes de contribuir, asegúrate de tener:
- Node.js >= 18.0 (o la versión especificada)
- Git configurado correctamente
- Editor con EditorConfig y Prettier

### Fork y Clonado
```bash
# 1. Fork el repositorio en GitHub
# 2. Clona tu fork
git clone https://github.com/tu-usuario/nombre-proyecto.git
cd nombre-proyecto

# 3. Configura el repositorio upstream
git remote add upstream https://github.com/jallal048/nombre-proyecto.git

# 4. Instala dependencias
npm install
```

### Configuración de Desarrollo
```bash
# Configura pre-commit hooks
npm run prepare

# Ejecuta el proyecto en modo desarrollo
npm run dev

# Verifica que todo funciona
npm test
```

## 🔄 Flujo de Trabajo

### 1. Sincronización
Antes de empezar cualquier trabajo:
```bash
git checkout main
git pull upstream main
git push origin main
```

### 2. Creación de Rama
```bash
# Usa nombres descriptivos siguiendo la convención:
# tipo/descripción-breve
git checkout -b feature/user-authentication
git checkout -b fix/memory-leak-dashboard
git checkout -b docs/api-documentation
git checkout -b refactor/database-queries
```

### 3. Desarrollo
- Realiza commits pequeños y frecuentes
- Escribe mensajes de commit descriptivos
- Ejecuta tests antes de cada commit
- Mantén tu rama actualizada con `main`

### 4. Finalización
```bash
# Ejecuta todos los checks antes de push
npm run lint
npm test
npm run build

# Push y creación de PR
git push origin feature/nombre-feature
```

## 📝 Estándares de Código

### Convenciones de Naming
```javascript
// Variables y funciones: camelCase
const userName = 'johndoe';
function calculateTotal() {}

// Constantes: UPPER_SNAKE_CASE
const MAX_RETRY_ATTEMPTS = 3;
const API_BASE_URL = 'https://api.example.com';

// Clases: PascalCase
class UserManager {}

// Archivos: kebab-case
// user-profile.component.js
// api-client.service.js
```

### Estructura de Funciones
```javascript
/**
 * Calcula el total de un pedido incluyendo impuestos
 * @param {number} subtotal - Subtotal antes de impuestos
 * @param {number} taxRate - Tasa de impuestos (0.1 para 10%)
 * @param {number} [discount=0] - Descuento aplicable
 * @returns {number} Total final del pedido
 * @throws {Error} Si los parámetros son inválidos
 */
function calculateOrderTotal(subtotal, taxRate, discount = 0) {
  // Validación de entrada
  if (subtotal < 0 || taxRate < 0 || discount < 0) {
    throw new Error('Los valores no pueden ser negativos');
  }
  
  // Cálculo principal
  const discountedSubtotal = subtotal - discount;
  const tax = discountedSubtotal * taxRate;
  const total = discountedSubtotal + tax;
  
  return Math.round(total * 100) / 100; // Redondeo a 2 decimales
}
```

### Formato de Commits
Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>[alcance opcional]: <descripción>

[cuerpo opcional]

[footer opcional]
```

**Tipos válidos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (espacios, punto y coma, etc.)
- `refactor`: Refactoring que no añade funcionalidad ni corrige bugs
- `test`: Añadir o corregir tests
- `chore`: Cambios en herramientas, configuración, etc.
- `perf`: Mejoras de rendimiento
- `ci`: Cambios en CI/CD

**Ejemplos:**
```
feat(auth): añadir autenticación con OAuth2

fix(api): corregir error de timeout en requests largos

docs: actualizar README con instrucciones de instalación

refactor(utils): simplificar función de validación de email

test(auth): añadir tests unitarios para login
```

## 🧪 Testing

### Tipos de Tests
1. **Unit Tests**: Funciones individuales
2. **Integration Tests**: Interacción entre componentes
3. **E2E Tests**: Flujos completos de usuario

### Escribiendo Tests
```javascript
// utils/math.test.js
import { describe, test, expect } from 'vitest';
import { calculateOrderTotal } from './math.js';

describe('calculateOrderTotal', () => {
  test('calcula correctamente el total con impuestos', () => {
    const result = calculateOrderTotal(100, 0.1);
    expect(result).toBe(110);
  });
  
  test('aplica descuento correctamente', () => {
    const result = calculateOrderTotal(100, 0.1, 10);
    expect(result).toBe(99);
  });
  
  test('lanza error con valores negativos', () => {
    expect(() => {
      calculateOrderTotal(-100, 0.1);
    }).toThrow('Los valores no pueden ser negativos');
  });
});
```

### Cobertura de Tests
- Objetivo: **>= 80%** de cobertura
- **100%** para funciones críticas (auth, payments, etc.)
- Ejecutar: `npm run test:coverage`

## 📚 Documentación

### README.md
Debe incluir:
- Descripción clara del proyecto
- Instrucciones de instalación
- Ejemplos de uso
- API documentation (si aplica)
- Contribución y licencia

### Documentación de Código
```javascript
/**
 * @fileoverview Utilidades para manejo de fechas
 * @author Tu Nombre <tu.email@example.com>
 * @since 1.0.0
 */

/**
 * @typedef {Object} DateRange
 * @property {Date} start - Fecha de inicio
 * @property {Date} end - Fecha de fin
 */

/**
 * Formatea una fecha según el locale especificado
 * @param {Date|string} date - Fecha a formatear
 * @param {string} [locale='es-ES'] - Locale para formateo
 * @param {Intl.DateTimeFormatOptions} [options] - Opciones de formato
 * @returns {string} Fecha formateada
 * @example
 * formatDate(new Date(), 'es-ES', { year: 'numeric', month: 'long' })
 * // => 'octubre 2024'
 */
function formatDate(date, locale = 'es-ES', options = {}) {
  // implementación...
}
```

## 🔍 Pull Requests

### Template de PR
Cada PR debe incluir:

```markdown
## 📝 Descripción
Breve descripción de los cambios realizados.

## 🔗 Issue Relacionado
Fixes #123

## 🧪 Testing
- [ ] Tests unitarios añadidos/actualizados
- [ ] Tests de integración pasan
- [ ] Testing manual realizado

## 📱 Screenshots (si aplica)
<!-- Añadir screenshots de cambios UI -->

## ✅ Checklist
- [ ] El código sigue las convenciones del proyecto
- [ ] Tests pasan localmente
- [ ] Documentación actualizada
- [ ] No hay console.log ni debugging code
- [ ] Performance impact evaluado
```

### Proceso de Review
1. **Auto-review**: Revisa tu propio código primero
2. **CI checks**: Asegúrate que todos los checks pasan
3. **Reviewers**: Solicita review de al menos 1 maintainer
4. **Changes requested**: Resuelve todos los comentarios
5. **Approval**: Listo para merge

## 🐛 Issues

### Reportando Bugs
```markdown
**Descripción del Bug**
Descripción clara y concisa del problema.

**Pasos para Reproducir**
1. Ir a '...'
2. Hacer click en '...'
3. Scroll hasta '...'
4. Ver error

**Comportamiento Esperado**
Qué esperabas que pasara.

**Screenshots**
Si es aplicable, añade screenshots.

**Información del Sistema:**
 - OS: [e.g. iOS]
 - Browser: [e.g. chrome, safari]
 - Version: [e.g. 22]

**Contexto Adicional**
Cualquier otra información relevante.
```

### Solicitando Features
```markdown
**¿Tu feature request está relacionada a un problema?**
Descripción clara del problema.

**Solución Propuesta**
Descripción clara de lo que quieres que pase.

**Alternativas Consideradas**
Otras soluciones que consideraste.

**Contexto Adicional**
Screenshots, mockups, etc.
```

## 💬 Comunicación

### Canales
- **GitHub Issues**: Para bugs y feature requests
- **GitHub Discussions**: Para preguntas generales
- **Email**: Para temas privados o urgentes

### Código de Conducta
- Sé respetuoso y constructivo
- Acepta feedback y críticas constructivas
- Ayuda a otros contribuidores
- Reporta comportamientos inapropiados

### Obtener Ayuda
1. Revisa documentación existente
2. Busca en issues cerrados
3. Pregunta en Discussions
4. Como último recurso, contacta maintainers

---

## 🏆 Reconocimientos

Todos los contribuidores son reconocidos en:
- Lista de contributors en README
- Release notes
- Hall of fame (contribuidores destacados)

¡Gracias por hacer este proyecto mejor! 🙌