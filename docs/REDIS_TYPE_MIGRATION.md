# Redis Type Safety Migration Guide

## Problem Solved

Redis stores all values as strings, causing type confusion bugs in our code:
- `event.reviewed === true` fails when Redis returns `"true"` (string)
- `event.reviewed === 'true'` fails when code expects boolean
- Numbers stored as strings break comparisons and calculations
- Mixed boolean/string checks lead to unreliable filtering

## Solution: TypedRedis Wrapper

The new `lib/redis-typed.js` wrapper automatically converts Redis string values to proper JavaScript types.

## Migration Examples

### Before (Type Confusion)
```javascript
import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.KINNST_KV_REST_API_URL,
  token: process.env.KINNST_KV_REST_API_TOKEN
});

// Problem: event.reviewed might be "true" string or true boolean
const event = await kv.hgetall(`radar:event:${id}`);

// Defensive coding with both checks
const isReviewed = event.reviewed === true || event.reviewed === 'true';
const isNotRejected = !event.rejected || event.rejected !== 'true';
```

### After (Type Safe)
```javascript
import { kv } from '../../lib/redis-typed.js';

// TypedRedis automatically converts "true" → true
const event = await kv.hgetall(`radar:event:${id}`);

// Clean, simple boolean checks
const isReviewed = event.reviewed === true;
const isNotRejected = !event.rejected;
```

## Files to Migrate

### High Priority (Critical Type Issues)
- `/api/events/widget.js` - Lines 54-55 have mixed boolean/string checks
- `/api/admin/radar-events.js` - Lines 78-79 filter events with type confusion
- `/api/radar/cleanup.js` - Complex boolean filtering logic

### Medium Priority (Less Critical)
- All files in `/api/radar/` that use `hgetall()`
- Any file checking `reviewed`, `rejected`, or other boolean fields

## Migration Steps

1. **Replace import:**
   ```javascript
   // OLD
   import { Redis } from '@upstash/redis';
   const kv = new Redis({...});

   // NEW
   import { kv } from '../../lib/redis-typed.js';
   ```

2. **Remove type confusion checks:**
   ```javascript
   // OLD
   if (event.reviewed === true || event.reviewed === 'true')

   // NEW
   if (event.reviewed === true)
   ```

3. **Test the migration:**
   - Check that boolean fields work correctly
   - Verify number comparisons function properly
   - Ensure no regressions in filtering logic

## Type Conversion Rules

The wrapper automatically handles:

| Redis String | JavaScript Type |
|--------------|----------------|
| `"true"`     | `true`         |
| `"false"`    | `false`        |
| `"123"`      | `123`          |
| `"45.67"`    | `45.67`        |
| `"hello"`    | `"hello"`      |
| `null`       | `null`         |

## Available Methods

The TypedRedis wrapper supports all common Redis operations:

- `get(key)` - Get value with type conversion
- `hgetall(key)` - Get hash with all values converted
- `hget(key, field)` - Get hash field with conversion
- `hset(key, data)` - Set hash data (no conversion needed)
- `hdel(key, ...fields)` - Delete hash fields
- `smembers(key)` - Get set members
- `sadd(key, ...members)` - Add to set
- `srem(key, ...members)` - Remove from set
- `sismember(key, member)` - Check set membership (returns boolean)
- `exists(key)` - Check key existence (returns boolean)
- `del(...keys)` - Delete keys
- `set(key, value)` - Set key value
- `expire(key, seconds)` - Set expiration
- `keys(pattern)` - Get keys by pattern

## Testing

To verify the wrapper works correctly:

```javascript
import { convertRedisValue, convertRedisObject } from './lib/redis-typed.js';

// Test value conversion
console.assert(convertRedisValue("true") === true);
console.assert(convertRedisValue("false") === false);
console.assert(convertRedisValue("123") === 123);
console.assert(convertRedisValue("hello") === "hello");

// Test object conversion
const redisObj = {
  reviewed: "true",
  count: "42",
  name: "Test Event"
};
const converted = convertRedisObject(redisObj);
console.assert(converted.reviewed === true);
console.assert(converted.count === 42);
console.assert(converted.name === "Test Event");
```

## Rollback Plan

If issues occur, the wrapper is backward compatible:
1. The underlying Redis client is accessible via `kv.redis`
2. You can temporarily use `kv.redis.hgetall()` for raw string values
3. The conversion functions can be called manually when needed

## Benefits

1. **Cleaner Code**: No more dual boolean/string checks
2. **Fewer Bugs**: Type consistency throughout the application
3. **Better Performance**: Single comparison instead of multiple
4. **Developer Experience**: Write code as if types were always correct
5. **Future Proof**: All new code automatically gets type safety