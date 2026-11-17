import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

/**
 * Visual regression & deterministic design-token test suite (Task 86e302a2b).
 * Verifies the 5 base components (Button, Card, Badge, Skeleton, Progress)
 * in both light and dark theme wrappers under a deterministic runner.
 */
describe('Visual Regression - 5 Base Components (Light & Dark)', () => {
  const themes = ['light', 'dark'] as const;

  describe('1. Button Component', () => {
    themes.forEach(theme => {
      it(`renders button variants consistently in ${theme} mode`, () => {
        const { container } = render(
          <div
            className={
              theme === 'dark'
                ? 'dark bg-background text-foreground'
                : 'bg-background text-foreground'
            }
          >
            <Button variant="default">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="outline">Outline</Button>
            <Button disabled>Disabled</Button>
          </div>
        );
        expect(container.firstChild).toMatchSnapshot();
      });
    });
  });

  describe('2. Card Component', () => {
    themes.forEach(theme => {
      it(`renders card layout and tokens in ${theme} mode`, () => {
        const { container } = render(
          <div
            className={
              theme === 'dark'
                ? 'dark bg-background text-foreground'
                : 'bg-background text-foreground'
            }
          >
            <Card className="w-80">
              <CardHeader>
                <h3 className="font-semibold text-lg">Outfit Sugerido</h3>
                <p className="text-sm text-muted-foreground">Estilo Minimalista</p>
              </CardHeader>
              <CardContent>
                <p>Contenido del card con prenda superior e inferior.</p>
              </CardContent>
              <CardFooter>
                <Button size="sm">Probar</Button>
              </CardFooter>
            </Card>
          </div>
        );
        expect(container.firstChild).toMatchSnapshot();
      });
    });
  });

  describe('3. Badge Component', () => {
    themes.forEach(theme => {
      it(`renders all badge states in ${theme} mode`, () => {
        const { container } = render(
          <div
            className={
              theme === 'dark'
                ? 'dark bg-background text-foreground'
                : 'bg-background text-foreground'
            }
          >
            <Badge variant="default">Default</Badge>
            <Badge variant="success">Completado</Badge>
            <Badge variant="warning">Pendiente</Badge>
            <Badge variant="outline">Contorno</Badge>
          </div>
        );
        expect(container.firstChild).toMatchSnapshot();
      });
    });
  });

  describe('4. Skeleton Component', () => {
    themes.forEach(theme => {
      it(`renders loading skeleton structure in ${theme} mode`, () => {
        const { container } = render(
          <div
            className={
              theme === 'dark'
                ? 'dark bg-background text-foreground'
                : 'bg-background text-foreground'
            }
          >
            <div className="flex flex-col gap-2 w-64">
              <Skeleton className="h-6 w-3/4" label="Título cargando" />
              <Skeleton className="h-4 w-full" label="Descripción cargando" />
              <Skeleton className="h-24 w-full" label="Imagen cargando" />
            </div>
          </div>
        );
        expect(container.firstChild).toMatchSnapshot();
      });
    });
  });

  describe('5. Progress Component', () => {
    themes.forEach(theme => {
      it(`renders progress determinate and indeterminate in ${theme} mode`, () => {
        const { container } = render(
          <div
            className={
              theme === 'dark'
                ? 'dark bg-background text-foreground'
                : 'bg-background text-foreground'
            }
          >
            <div className="flex flex-col gap-3 w-64">
              <Progress value={45} />
              <Progress value={100} />
              <Progress indeterminateLabel="Procesando simulación..." />
            </div>
          </div>
        );
        expect(container.firstChild).toMatchSnapshot();
      });
    });
  });
});
