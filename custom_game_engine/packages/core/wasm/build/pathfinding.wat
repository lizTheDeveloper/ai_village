(module
 (type $0 (func (param i32 i32 i32 i32)))
 (type $1 (func (param i32 i32 i32 f32 i32)))
 (type $2 (func))
 (type $3 (func (param i32 i32 f32 i32)))
 (type $4 (func (param i32 i32 f32 f32 i32)))
 (type $5 (func (param i32 f32 i32)))
 (type $6 (func (param i32 i32 i32) (result f32)))
 (type $7 (func (param i32 i32) (result f32)))
 (type $8 (func (param i32 i32) (result i32)))
 (type $9 (func (param i32) (result i32)))
 (type $10 (func (param i32)))
 (import "env" "abort" (func $~lib/builtins/abort (param i32 i32 i32 i32)))
 (global $~lib/rt/stub/offset (mut i32) (i32.const 0))
 (global $~lib/rt/__rtti_base i32 (i32.const 1168))
 (memory $0 1)
 (data $0 (i32.const 1036) "<")
 (data $0.1 (i32.const 1048) "\02\00\00\00(\00\00\00A\00l\00l\00o\00c\00a\00t\00i\00o\00n\00 \00t\00o\00o\00 \00l\00a\00r\00g\00e")
 (data $1 (i32.const 1100) "<")
 (data $1.1 (i32.const 1112) "\02\00\00\00\1e\00\00\00~\00l\00i\00b\00/\00r\00t\00/\00s\00t\00u\00b\00.\00t\00s")
 (data $2 (i32.const 1168) "\05\00\00\00 \00\00\00 \00\00\00 \00\00\00\00\00\00\00\01\19")
 (table $0 1 funcref)
 (export "addArraysSIMD" (func $assembly/simd-ops/addArraysSIMD))
 (export "subtractArraysSIMD" (func $assembly/simd-ops/subtractArraysSIMD))
 (export "scaleArraySIMD" (func $assembly/simd-ops/scaleArraySIMD))
 (export "fmaSIMD" (func $assembly/simd-ops/fmaSIMD))
 (export "multiplyArraysSIMD" (func $assembly/simd-ops/multiplyArraysSIMD))
 (export "distanceSquaredSIMD" (func $assembly/simd-ops/distanceSquaredSIMD))
 (export "clampArraySIMD" (func $assembly/simd-ops/clampArraySIMD))
 (export "lerpSIMD" (func $assembly/simd-ops/lerpSIMD))
 (export "fillArraySIMD" (func $assembly/simd-ops/fillArraySIMD))
 (export "dotProductSIMD" (func $assembly/simd-ops/dotProductSIMD))
 (export "sumSIMD" (func $assembly/simd-ops/sumSIMD))
 (export "__new" (func $~lib/rt/stub/__new))
 (export "__pin" (func $~lib/rt/stub/__pin))
 (export "__unpin" (func $~lib/rt/stub/__unpin))
 (export "__collect" (func $~lib/rt/stub/__collect))
 (export "__rtti_base" (global $~lib/rt/__rtti_base))
 (export "memory" (memory $0))
 (export "table" (table $0))
 (start $~start)
 (func $assembly/simd-ops/addArraysSIMD (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  (local $5 i32)
  loop $for-loop|0
   local.get $4
   i32.const 4
   i32.add
   local.tee $5
   local.get $3
   i32.le_s
   if
    local.get $4
    i32.const 2
    i32.shl
    local.tee $4
    local.get $0
    i32.add
    local.get $1
    local.get $4
    i32.add
    v128.load
    local.get $2
    local.get $4
    i32.add
    v128.load
    f32x4.add
    v128.store
    local.get $5
    local.set $4
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $3
   local.get $4
   i32.gt_s
   if
    local.get $4
    i32.const 2
    i32.shl
    local.tee $5
    local.get $0
    i32.load offset=4
    i32.add
    local.get $5
    local.get $1
    i32.load offset=4
    i32.add
    f32.load
    local.get $5
    local.get $2
    i32.load offset=4
    i32.add
    f32.load
    f32.add
    f32.store
    local.get $4
    i32.const 1
    i32.add
    local.set $4
    br $for-loop|1
   end
  end
 )
 (func $assembly/simd-ops/subtractArraysSIMD (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  (local $5 i32)
  loop $for-loop|0
   local.get $4
   i32.const 4
   i32.add
   local.tee $5
   local.get $3
   i32.le_s
   if
    local.get $4
    i32.const 2
    i32.shl
    local.tee $4
    local.get $0
    i32.add
    local.get $1
    local.get $4
    i32.add
    v128.load
    local.get $2
    local.get $4
    i32.add
    v128.load
    f32x4.sub
    v128.store
    local.get $5
    local.set $4
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $3
   local.get $4
   i32.gt_s
   if
    local.get $4
    i32.const 2
    i32.shl
    local.tee $5
    local.get $0
    i32.load offset=4
    i32.add
    local.get $5
    local.get $1
    i32.load offset=4
    i32.add
    f32.load
    local.get $5
    local.get $2
    i32.load offset=4
    i32.add
    f32.load
    f32.sub
    f32.store
    local.get $4
    i32.const 1
    i32.add
    local.set $4
    br $for-loop|1
   end
  end
 )
 (func $assembly/simd-ops/scaleArraySIMD (param $0 i32) (param $1 i32) (param $2 f32) (param $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 v128)
  local.get $2
  f32x4.splat
  local.set $6
  loop $for-loop|0
   local.get $4
   i32.const 4
   i32.add
   local.tee $5
   local.get $3
   i32.le_s
   if
    local.get $4
    i32.const 2
    i32.shl
    local.tee $4
    local.get $0
    i32.add
    local.get $1
    local.get $4
    i32.add
    v128.load
    local.get $6
    f32x4.mul
    v128.store
    local.get $5
    local.set $4
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $3
   local.get $4
   i32.gt_s
   if
    local.get $4
    i32.const 2
    i32.shl
    local.tee $5
    local.get $0
    i32.load offset=4
    i32.add
    local.get $5
    local.get $1
    i32.load offset=4
    i32.add
    f32.load
    local.get $2
    f32.mul
    f32.store
    local.get $4
    i32.const 1
    i32.add
    local.set $4
    br $for-loop|1
   end
  end
 )
 (func $assembly/simd-ops/fmaSIMD (param $0 i32) (param $1 i32) (param $2 i32) (param $3 f32) (param $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 v128)
  local.get $3
  f32x4.splat
  local.set $7
  loop $for-loop|0
   local.get $5
   i32.const 4
   i32.add
   local.tee $6
   local.get $4
   i32.le_s
   if
    local.get $5
    i32.const 2
    i32.shl
    local.tee $5
    local.get $0
    i32.add
    local.get $1
    local.get $5
    i32.add
    v128.load
    local.get $2
    local.get $5
    i32.add
    v128.load
    local.get $7
    f32x4.mul
    f32x4.add
    v128.store
    local.get $6
    local.set $5
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $4
   local.get $5
   i32.gt_s
   if
    local.get $5
    i32.const 2
    i32.shl
    local.tee $6
    local.get $0
    i32.load offset=4
    i32.add
    local.get $6
    local.get $1
    i32.load offset=4
    i32.add
    f32.load
    local.get $6
    local.get $2
    i32.load offset=4
    i32.add
    f32.load
    local.get $3
    f32.mul
    f32.add
    f32.store
    local.get $5
    i32.const 1
    i32.add
    local.set $5
    br $for-loop|1
   end
  end
 )
 (func $assembly/simd-ops/multiplyArraysSIMD (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  (local $5 i32)
  loop $for-loop|0
   local.get $4
   i32.const 4
   i32.add
   local.tee $5
   local.get $3
   i32.le_s
   if
    local.get $4
    i32.const 2
    i32.shl
    local.tee $4
    local.get $0
    i32.add
    local.get $1
    local.get $4
    i32.add
    v128.load
    local.get $2
    local.get $4
    i32.add
    v128.load
    f32x4.mul
    v128.store
    local.get $5
    local.set $4
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $3
   local.get $4
   i32.gt_s
   if
    local.get $4
    i32.const 2
    i32.shl
    local.tee $5
    local.get $0
    i32.load offset=4
    i32.add
    local.get $5
    local.get $1
    i32.load offset=4
    i32.add
    f32.load
    local.get $5
    local.get $2
    i32.load offset=4
    i32.add
    f32.load
    f32.mul
    f32.store
    local.get $4
    i32.const 1
    i32.add
    local.set $4
    br $for-loop|1
   end
  end
 )
 (func $assembly/simd-ops/distanceSquaredSIMD (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 f32)
  (local $7 v128)
  loop $for-loop|0
   local.get $4
   i32.const 4
   i32.add
   local.tee $5
   local.get $3
   i32.le_s
   if
    local.get $4
    i32.const 2
    i32.shl
    local.tee $4
    local.get $1
    i32.add
    v128.load
    local.set $7
    local.get $0
    local.get $4
    i32.add
    local.get $7
    local.get $7
    f32x4.mul
    local.get $2
    local.get $4
    i32.add
    v128.load
    local.tee $7
    local.get $7
    f32x4.mul
    f32x4.add
    v128.store
    local.get $5
    local.set $4
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $3
   local.get $4
   i32.gt_s
   if
    local.get $4
    i32.const 2
    i32.shl
    local.tee $5
    local.get $0
    i32.load offset=4
    i32.add
    local.get $5
    local.get $1
    i32.load offset=4
    i32.add
    f32.load
    local.tee $6
    local.get $6
    f32.mul
    local.get $5
    local.get $2
    i32.load offset=4
    i32.add
    f32.load
    local.tee $6
    local.get $6
    f32.mul
    f32.add
    f32.store
    local.get $4
    i32.const 1
    i32.add
    local.set $4
    br $for-loop|1
   end
  end
 )
 (func $assembly/simd-ops/clampArraySIMD (param $0 i32) (param $1 i32) (param $2 f32) (param $3 f32) (param $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 f32)
  (local $8 v128)
  (local $9 v128)
  local.get $2
  f32x4.splat
  local.set $8
  local.get $3
  f32x4.splat
  local.set $9
  loop $for-loop|0
   local.get $5
   i32.const 4
   i32.add
   local.tee $6
   local.get $4
   i32.le_s
   if
    local.get $5
    i32.const 2
    i32.shl
    local.tee $5
    local.get $0
    i32.add
    local.get $8
    local.get $9
    local.get $1
    local.get $5
    i32.add
    v128.load
    f32x4.min
    f32x4.max
    v128.store
    local.get $6
    local.set $5
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $4
   local.get $5
   i32.gt_s
   if
    local.get $1
    i32.load offset=4
    local.get $5
    i32.const 2
    i32.shl
    i32.add
    f32.load
    local.tee $7
    local.get $2
    f32.lt
    if
     local.get $2
     local.set $7
    end
    local.get $0
    i32.load offset=4
    local.get $5
    i32.const 2
    i32.shl
    i32.add
    local.get $3
    local.get $7
    local.get $3
    local.get $7
    f32.lt
    select
    f32.store
    local.get $5
    i32.const 1
    i32.add
    local.set $5
    br $for-loop|1
   end
  end
 )
 (func $assembly/simd-ops/lerpSIMD (param $0 i32) (param $1 i32) (param $2 i32) (param $3 f32) (param $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 f32)
  (local $8 v128)
  (local $9 v128)
  local.get $3
  f32x4.splat
  local.set $8
  loop $for-loop|0
   local.get $5
   i32.const 4
   i32.add
   local.tee $6
   local.get $4
   i32.le_s
   if
    local.get $5
    i32.const 2
    i32.shl
    local.tee $5
    local.get $1
    i32.add
    v128.load
    local.set $9
    local.get $0
    local.get $5
    i32.add
    local.get $9
    local.get $2
    local.get $5
    i32.add
    v128.load
    local.get $9
    f32x4.sub
    local.get $8
    f32x4.mul
    f32x4.add
    v128.store
    local.get $6
    local.set $5
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $4
   local.get $5
   i32.gt_s
   if
    local.get $5
    i32.const 2
    i32.shl
    local.tee $6
    local.get $0
    i32.load offset=4
    i32.add
    local.get $6
    local.get $1
    i32.load offset=4
    i32.add
    f32.load
    local.tee $7
    local.get $6
    local.get $2
    i32.load offset=4
    i32.add
    f32.load
    local.get $7
    f32.sub
    local.get $3
    f32.mul
    f32.add
    f32.store
    local.get $5
    i32.const 1
    i32.add
    local.set $5
    br $for-loop|1
   end
  end
 )
 (func $assembly/simd-ops/fillArraySIMD (param $0 i32) (param $1 f32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 v128)
  local.get $1
  f32x4.splat
  local.set $5
  loop $for-loop|0
   local.get $3
   i32.const 4
   i32.add
   local.tee $4
   local.get $2
   i32.le_s
   if
    local.get $0
    local.get $3
    i32.const 2
    i32.shl
    i32.add
    local.get $5
    v128.store
    local.get $4
    local.set $3
    br $for-loop|0
   end
  end
  loop $for-loop|1
   local.get $2
   local.get $3
   i32.gt_s
   if
    local.get $0
    i32.load offset=4
    local.get $3
    i32.const 2
    i32.shl
    i32.add
    local.get $1
    f32.store
    local.get $3
    i32.const 1
    i32.add
    local.set $3
    br $for-loop|1
   end
  end
 )
 (func $assembly/simd-ops/dotProductSIMD (param $0 i32) (param $1 i32) (param $2 i32) (result f32)
  (local $3 i32)
  (local $4 i32)
  (local $5 f32)
  (local $6 v128)
  loop $for-loop|0
   local.get $3
   i32.const 4
   i32.add
   local.tee $4
   local.get $2
   i32.le_s
   if
    local.get $6
    local.get $3
    i32.const 2
    i32.shl
    local.tee $3
    local.get $0
    i32.add
    v128.load
    local.get $1
    local.get $3
    i32.add
    v128.load
    f32x4.mul
    f32x4.add
    local.set $6
    local.get $4
    local.set $3
    br $for-loop|0
   end
  end
  local.get $6
  f32x4.extract_lane 0
  local.get $6
  f32x4.extract_lane 1
  f32.add
  local.get $6
  f32x4.extract_lane 2
  f32.add
  local.get $6
  f32x4.extract_lane 3
  f32.add
  local.set $5
  loop $for-loop|1
   local.get $2
   local.get $3
   i32.gt_s
   if
    local.get $5
    local.get $3
    i32.const 2
    i32.shl
    local.tee $4
    local.get $0
    i32.load offset=4
    i32.add
    f32.load
    local.get $4
    local.get $1
    i32.load offset=4
    i32.add
    f32.load
    f32.mul
    f32.add
    local.set $5
    local.get $3
    i32.const 1
    i32.add
    local.set $3
    br $for-loop|1
   end
  end
  local.get $5
 )
 (func $assembly/simd-ops/sumSIMD (param $0 i32) (param $1 i32) (result f32)
  (local $2 i32)
  (local $3 i32)
  (local $4 f32)
  (local $5 v128)
  loop $for-loop|0
   local.get $3
   i32.const 4
   i32.add
   local.tee $2
   local.get $1
   i32.le_s
   if
    local.get $5
    local.get $0
    local.get $3
    i32.const 2
    i32.shl
    i32.add
    v128.load
    f32x4.add
    local.set $5
    local.get $2
    local.set $3
    br $for-loop|0
   end
  end
  local.get $5
  f32x4.extract_lane 0
  local.get $5
  f32x4.extract_lane 1
  f32.add
  local.get $5
  f32x4.extract_lane 2
  f32.add
  local.get $5
  f32x4.extract_lane 3
  f32.add
  local.set $4
  loop $for-loop|1
   local.get $1
   local.get $3
   i32.gt_s
   if
    local.get $4
    local.get $0
    i32.load offset=4
    local.get $3
    i32.const 2
    i32.shl
    i32.add
    f32.load
    f32.add
    local.set $4
    local.get $3
    i32.const 1
    i32.add
    local.set $3
    br $for-loop|1
   end
  end
  local.get $4
 )
 (func $~lib/rt/stub/__new (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  local.get $0
  i32.const 1073741804
  i32.gt_u
  if
   i32.const 1056
   i32.const 1120
   i32.const 86
   i32.const 30
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 16
  i32.add
  local.tee $4
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1056
   i32.const 1120
   i32.const 33
   i32.const 29
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/stub/offset
  local.set $3
  global.get $~lib/rt/stub/offset
  i32.const 4
  i32.add
  local.tee $2
  local.get $4
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.tee $4
  i32.add
  local.tee $5
  memory.size
  local.tee $6
  i32.const 16
  i32.shl
  i32.const 15
  i32.add
  i32.const -16
  i32.and
  local.tee $7
  i32.gt_u
  if
   local.get $6
   local.get $5
   local.get $7
   i32.sub
   i32.const 65535
   i32.add
   i32.const -65536
   i32.and
   i32.const 16
   i32.shr_u
   local.tee $7
   local.get $6
   local.get $7
   i32.gt_s
   select
   memory.grow
   i32.const 0
   i32.lt_s
   if
    local.get $7
    memory.grow
    i32.const 0
    i32.lt_s
    if
     unreachable
    end
   end
  end
  local.get $5
  global.set $~lib/rt/stub/offset
  local.get $3
  local.get $4
  i32.store
  local.get $2
  i32.const 4
  i32.sub
  local.tee $3
  i32.const 0
  i32.store offset=4
  local.get $3
  i32.const 0
  i32.store offset=8
  local.get $3
  local.get $1
  i32.store offset=12
  local.get $3
  local.get $0
  i32.store offset=16
  local.get $2
  i32.const 16
  i32.add
 )
 (func $~lib/rt/stub/__pin (param $0 i32) (result i32)
  local.get $0
 )
 (func $~lib/rt/stub/__unpin (param $0 i32)
 )
 (func $~lib/rt/stub/__collect
 )
 (func $~start
  i32.const 1196
  global.set $~lib/rt/stub/offset
 )
)
