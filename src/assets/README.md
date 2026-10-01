# Assets

Put images here and refer to them by path from the code:

- `logos/` for logos (bank, merchant, brand marks)
- `images/` for everything else

```tsx
import { asset } from '../assets';

<img src={asset('logos/chase.png')} alt="Chase" />
```

Supported formats: png, jpg, jpeg, svg, webp, gif, ico. Add the file, save, and it is available
straight away. Prefer SVG or a PNG at 2x the size it is shown.
