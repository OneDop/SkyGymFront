import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'freezeAllowance' })
export class FreezeAllowancePipe implements PipeTransform {
  transform(days: number | null | undefined, count: number | null | undefined): string {
    if (!days || !count) return 'None';
    const dayText = `${days} ${days === 1 ? 'day' : 'days'}`;
    const countText = `${count} ${count === 1 ? 'freeze' : 'freezes'}`;
    return `${dayText} / ${countText}`;
  }
}
