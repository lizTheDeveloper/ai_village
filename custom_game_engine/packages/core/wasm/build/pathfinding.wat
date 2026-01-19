(module
 (type $0 (func (param i32) (result i32)))
 (type $1 (func (param i32 i32) (result i32)))
 (type $2 (func (param i32 i32)))
 (type $3 (func (param i32 i32 i32) (result i32)))
 (type $4 (func (param i32 i32 i32)))
 (type $5 (func))
 (type $6 (func (param i32 i32 i32 i32)))
 (type $7 (func (param i32 i32 f32 f32 i32 i32) (result i32)))
 (type $8 (func (param i32 i32 f32)))
 (type $9 (func (param i32 i32 i32 i32 i32 i32) (result i32)))
 (type $10 (func (param i32 i32 i32 i32 i32 i32 i32 i32 i32 i32) (result i32)))
 (type $11 (func (result i32)))
 (type $12 (func (param i32)))
 (import "env" "abort" (func $~lib/builtins/abort (param i32 i32 i32 i32)))
 (global $~lib/rt/stub/offset (mut i32) (i32.const 0))
 (global $~lib/rt/__rtti_base i32 (i32.const 1872))
 (memory $0 1)
 (data $0 (i32.const 1036) "<")
 (data $0.1 (i32.const 1048) "\02\00\00\00$\00\00\00I\00n\00d\00e\00x\00 \00o\00u\00t\00 \00o\00f\00 \00r\00a\00n\00g\00e")
 (data $1 (i32.const 1100) "<")
 (data $1.1 (i32.const 1112) "\02\00\00\00$\00\00\00~\00l\00i\00b\00/\00t\00y\00p\00e\00d\00a\00r\00r\00a\00y\00.\00t\00s")
 (data $2 (i32.const 1164) ",")
 (data $2.1 (i32.const 1176) "\02\00\00\00\1c\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00l\00e\00n\00g\00t\00h")
 (data $3 (i32.const 1212) "<")
 (data $3.1 (i32.const 1224) "\02\00\00\00(\00\00\00A\00l\00l\00o\00c\00a\00t\00i\00o\00n\00 \00t\00o\00o\00 \00l\00a\00r\00g\00e")
 (data $4 (i32.const 1276) "<")
 (data $4.1 (i32.const 1288) "\02\00\00\00\1e\00\00\00~\00l\00i\00b\00/\00r\00t\00/\00s\00t\00u\00b\00.\00t\00s")
 (data $5 (i32.const 1340) "\1c")
 (data $5.1 (i32.const 1352) "\01")
 (data $6 (i32.const 1372) "<")
 (data $6.1 (i32.const 1384) "\02\00\00\00&\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00b\00u\00f\00f\00e\00r\00.\00t\00s")
 (data $7 (i32.const 1436) ",")
 (data $7.1 (i32.const 1448) "\02\00\00\00\1a\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00.\00t\00s")
 (data $8 (i32.const 1484) "|")
 (data $8.1 (i32.const 1496) "\02\00\00\00^\00\00\00E\00l\00e\00m\00e\00n\00t\00 \00t\00y\00p\00e\00 \00m\00u\00s\00t\00 \00b\00e\00 \00n\00u\00l\00l\00a\00b\00l\00e\00 \00i\00f\00 \00a\00r\00r\00a\00y\00 \00i\00s\00 \00h\00o\00l\00e\00y")
 (data $9 (i32.const 1612) "<")
 (data $9.1 (i32.const 1624) "\01\00\00\00 \00\00\00\00\00\00\00\01\00\00\00\01")
 (data $9.2 (i32.const 1652) "\ff\ff\ff\ff\ff\ff\ff\ff")
 (data $10 (i32.const 1676) ",")
 (data $10.1 (i32.const 1688) "\02\00\00\00\1c\00\00\00A\00r\00r\00a\00y\00 \00i\00s\00 \00e\00m\00p\00t\00y")
 (data $11 (i32.const 1724) "\1c")
 (data $11.1 (i32.const 1736) "\01")
 (data $12 (i32.const 1756) "<")
 (data $12.1 (i32.const 1768) "\02\00\00\00$\00\00\00K\00e\00y\00 \00d\00o\00e\00s\00 \00n\00o\00t\00 \00e\00x\00i\00s\00t")
 (data $13 (i32.const 1820) ",")
 (data $13.1 (i32.const 1832) "\02\00\00\00\16\00\00\00~\00l\00i\00b\00/\00m\00a\00p\00.\00t\00s")
 (data $14 (i32.const 1872) "\r\00\00\00 \00\00\00 \00\00\00 \00\00\00\00\00\00\00A\00\00\00\01\t\00\00\00\00\00\00 \00\00\00\02A\00\00\02\t\00\00\08\t\00\00\10\t\12\00\10\19\12")
 (table $0 1 funcref)
 (export "findPath" (func $assembly/pathfinding/findPath))
 (export "allocateObstacles" (func $assembly/pathfinding/allocateObstacles))
 (export "allocateOutput" (func $assembly/pathfinding/allocateOutput))
 (export "getMemorySize" (func $assembly/pathfinding/getMemorySize))
 (export "__new" (func $~lib/rt/stub/__new))
 (export "__pin" (func $~lib/rt/stub/__pin))
 (export "__unpin" (func $~lib/rt/stub/__unpin))
 (export "__collect" (func $~lib/rt/stub/__collect))
 (export "__rtti_base" (global $~lib/rt/__rtti_base))
 (export "memory" (memory $0))
 (export "table" (table $0))
 (start $~start)
 (func $~lib/rt/stub/__alloc (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $0
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1232
   i32.const 1296
   i32.const 33
   i32.const 29
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/stub/offset
  local.set $1
  global.get $~lib/rt/stub/offset
  i32.const 4
  i32.add
  local.tee $2
  local.get $0
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.tee $0
  i32.add
  local.tee $3
  memory.size
  local.tee $4
  i32.const 16
  i32.shl
  i32.const 15
  i32.add
  i32.const -16
  i32.and
  local.tee $5
  i32.gt_u
  if
   local.get $4
   local.get $3
   local.get $5
   i32.sub
   i32.const 65535
   i32.add
   i32.const -65536
   i32.and
   i32.const 16
   i32.shr_u
   local.tee $5
   local.get $4
   local.get $5
   i32.gt_s
   select
   memory.grow
   i32.const 0
   i32.lt_s
   if
    local.get $5
    memory.grow
    i32.const 0
    i32.lt_s
    if
     unreachable
    end
   end
  end
  local.get $3
  global.set $~lib/rt/stub/offset
  local.get $1
  local.get $0
  i32.store
  local.get $2
 )
 (func $~lib/rt/stub/__new (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  local.get $0
  i32.const 1073741804
  i32.gt_u
  if
   i32.const 1232
   i32.const 1296
   i32.const 86
   i32.const 30
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 16
  i32.add
  call $~lib/rt/stub/__alloc
  local.tee $3
  i32.const 4
  i32.sub
  local.tee $2
  i32.const 0
  i32.store offset=4
  local.get $2
  i32.const 0
  i32.store offset=8
  local.get $2
  local.get $1
  i32.store offset=12
  local.get $2
  local.get $0
  i32.store offset=16
  local.get $3
  i32.const 16
  i32.add
 )
 (func $~lib/typedarray/Int32Array.wrap (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  local.set $2
  local.get $1
  i32.const 0
  i32.lt_s
  if
   local.get $1
   i32.const -1
   i32.eq
   if
    local.get $2
    i32.const 3
    i32.and
    if
     i32.const 1184
     i32.const 1120
     i32.const 1865
     i32.const 9
     call $~lib/builtins/abort
     unreachable
    end
   else
    i32.const 1184
    i32.const 1120
    i32.const 1869
    i32.const 7
    call $~lib/builtins/abort
    unreachable
   end
   local.get $2
   local.set $1
  else
   local.get $1
   i32.const 2
   i32.shl
   local.tee $1
   local.get $2
   i32.gt_s
   if
    i32.const 1184
    i32.const 1120
    i32.const 1874
    i32.const 7
    call $~lib/builtins/abort
    unreachable
   end
  end
  i32.const 12
  i32.const 5
  call $~lib/rt/stub/__new
  local.tee $2
  local.get $0
  i32.store
  local.get $2
  local.get $1
  i32.store offset=8
  local.get $2
  local.get $0
  i32.store offset=4
  local.get $2
 )
 (func $~lib/rt/__newArray (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  local.get $0
  i32.const 2
  i32.shl
  local.tee $4
  i32.const 1
  call $~lib/rt/stub/__new
  local.set $3
  local.get $2
  if
   local.get $3
   local.get $2
   local.get $4
   memory.copy
  end
  i32.const 16
  local.get $1
  call $~lib/rt/stub/__new
  local.tee $1
  local.get $3
  i32.store
  local.get $1
  local.get $3
  i32.store offset=4
  local.get $1
  local.get $4
  i32.store offset=8
  local.get $1
  local.get $0
  i32.store offset=12
  local.get $1
 )
 (func $~lib/arraybuffer/ArrayBuffer#constructor (param $0 i32) (result i32)
  (local $1 i32)
  local.get $0
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1184
   i32.const 1392
   i32.const 52
   i32.const 43
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 1
  call $~lib/rt/stub/__new
  local.tee $1
  i32.const 0
  local.get $0
  memory.fill
  local.get $1
 )
 (func $assembly/pathfinding/PathNode#constructor (param $0 i32) (param $1 i32) (param $2 f32) (param $3 f32) (param $4 i32) (param $5 i32) (result i32)
  (local $6 i32)
  i32.const 24
  i32.const 7
  call $~lib/rt/stub/__new
  local.tee $6
  local.get $0
  i32.store
  local.get $6
  local.get $1
  i32.store offset=4
  local.get $6
  local.get $2
  f32.store offset=8
  local.get $6
  local.get $3
  f32.store offset=12
  local.get $6
  local.get $4
  i32.store offset=16
  local.get $6
  local.get $5
  i32.store offset=20
  local.get $6
 )
 (func $~lib/array/ensureCapacity (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  local.get $1
  local.get $0
  i32.load offset=8
  local.tee $3
  i32.const 2
  i32.shr_u
  i32.gt_u
  if
   local.get $1
   i32.const 268435455
   i32.gt_u
   if
    i32.const 1184
    i32.const 1456
    i32.const 19
    i32.const 48
    call $~lib/builtins/abort
    unreachable
   end
   local.get $0
   i32.load
   local.set $4
   i32.const 1073741820
   local.get $3
   i32.const 1
   i32.shl
   local.tee $2
   local.get $2
   i32.const 1073741820
   i32.ge_u
   select
   local.tee $2
   i32.const 8
   local.get $1
   local.get $1
   i32.const 8
   i32.le_u
   select
   i32.const 2
   i32.shl
   local.tee $1
   local.get $1
   local.get $2
   i32.lt_u
   select
   local.tee $5
   i32.const 1073741804
   i32.gt_u
   if
    i32.const 1232
    i32.const 1296
    i32.const 99
    i32.const 30
    call $~lib/builtins/abort
    unreachable
   end
   local.get $4
   i32.const 16
   i32.sub
   local.tee $1
   i32.const 15
   i32.and
   i32.const 1
   local.get $1
   select
   if
    i32.const 0
    i32.const 1296
    i32.const 45
    i32.const 3
    call $~lib/builtins/abort
    unreachable
   end
   global.get $~lib/rt/stub/offset
   local.get $1
   i32.const 4
   i32.sub
   local.tee $6
   i32.load
   local.tee $7
   local.get $1
   i32.add
   i32.eq
   local.set $8
   local.get $5
   i32.const 16
   i32.add
   local.tee $9
   i32.const 19
   i32.add
   i32.const -16
   i32.and
   i32.const 4
   i32.sub
   local.set $2
   local.get $7
   local.get $9
   i32.lt_u
   if
    local.get $8
    if
     local.get $9
     i32.const 1073741820
     i32.gt_u
     if
      i32.const 1232
      i32.const 1296
      i32.const 52
      i32.const 33
      call $~lib/builtins/abort
      unreachable
     end
     local.get $1
     local.get $2
     i32.add
     local.tee $7
     memory.size
     local.tee $8
     i32.const 16
     i32.shl
     i32.const 15
     i32.add
     i32.const -16
     i32.and
     local.tee $9
     i32.gt_u
     if
      local.get $8
      local.get $7
      local.get $9
      i32.sub
      i32.const 65535
      i32.add
      i32.const -65536
      i32.and
      i32.const 16
      i32.shr_u
      local.tee $9
      local.get $8
      local.get $9
      i32.gt_s
      select
      memory.grow
      i32.const 0
      i32.lt_s
      if
       local.get $9
       memory.grow
       i32.const 0
       i32.lt_s
       if
        unreachable
       end
      end
     end
     local.get $7
     global.set $~lib/rt/stub/offset
     local.get $6
     local.get $2
     i32.store
    else
     local.get $2
     local.get $7
     i32.const 1
     i32.shl
     local.tee $6
     local.get $2
     local.get $6
     i32.gt_u
     select
     call $~lib/rt/stub/__alloc
     local.tee $2
     local.get $1
     local.get $7
     memory.copy
     local.get $2
     local.set $1
    end
   else
    local.get $8
    if
     local.get $1
     local.get $2
     i32.add
     global.set $~lib/rt/stub/offset
     local.get $6
     local.get $2
     i32.store
    end
   end
   local.get $1
   i32.const 4
   i32.sub
   local.get $5
   i32.store offset=16
   local.get $3
   local.get $1
   i32.const 16
   i32.add
   local.tee $1
   i32.add
   i32.const 0
   local.get $5
   local.get $3
   i32.sub
   memory.fill
   local.get $1
   local.get $4
   i32.ne
   if
    local.get $0
    local.get $1
    i32.store
    local.get $0
    local.get $1
    i32.store offset=4
   end
   local.get $0
   local.get $5
   i32.store offset=8
  end
 )
 (func $~lib/array/Array<assembly/pathfinding/PathNode>#__get (param $0 i32) (param $1 i32) (result i32)
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   i32.const 1056
   i32.const 1456
   i32.const 114
   i32.const 42
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.tee $0
  i32.eqz
  if
   i32.const 1504
   i32.const 1456
   i32.const 118
   i32.const 40
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
 )
 (func $~lib/array/Array<assembly/pathfinding/PathNode>#__set (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   local.get $1
   i32.const 0
   i32.lt_s
   if
    i32.const 1056
    i32.const 1456
    i32.const 130
    i32.const 22
    call $~lib/builtins/abort
    unreachable
   end
   local.get $0
   local.get $1
   i32.const 1
   i32.add
   local.tee $3
   call $~lib/array/ensureCapacity
   local.get $0
   local.get $3
   i32.store offset=12
  end
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  local.get $2
  i32.store
 )
 (func $assembly/pathfinding/PriorityQueue#push (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  local.get $0
  i32.load
  local.tee $2
  i32.load offset=12
  local.tee $3
  i32.const 1
  i32.add
  local.set $4
  local.get $2
  local.get $4
  call $~lib/array/ensureCapacity
  local.get $2
  i32.load offset=4
  local.get $3
  i32.const 2
  i32.shl
  i32.add
  local.get $1
  i32.store
  local.get $2
  local.get $4
  i32.store offset=12
  local.get $0
  local.tee $2
  i32.load
  local.tee $1
  i32.load offset=12
  i32.const 1
  i32.sub
  local.set $0
  local.get $1
  local.get $0
  call $~lib/array/Array<assembly/pathfinding/PathNode>#__get
  local.set $3
  loop $while-continue|0
   local.get $0
   i32.const 0
   i32.gt_s
   if
    block $while-break|0
     local.get $2
     i32.load
     local.get $0
     i32.const 1
     i32.sub
     i32.const 1
     i32.shr_s
     local.tee $1
     call $~lib/array/Array<assembly/pathfinding/PathNode>#__get
     local.set $4
     local.get $3
     f32.load offset=8
     local.get $3
     f32.load offset=12
     f32.add
     local.get $4
     f32.load offset=8
     local.get $4
     f32.load offset=12
     f32.add
     f32.ge
     br_if $while-break|0
     local.get $2
     i32.load
     local.get $0
     local.get $4
     call $~lib/array/Array<assembly/pathfinding/PathNode>#__set
     local.get $1
     local.set $0
     br $while-continue|0
    end
   end
  end
  local.get $2
  i32.load
  local.get $0
  local.get $3
  call $~lib/array/Array<assembly/pathfinding/PathNode>#__set
 )
 (func $"~lib/map/Map<i32,f32>#set" (param $0 i32) (param $1 i32) (param $2 f32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  local.get $0
  i32.load
  local.get $1
  local.tee $3
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $1
  local.get $1
  i32.const 15
  i32.shr_u
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $1
  local.get $1
  i32.const 13
  i32.shr_u
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $1
  local.get $1
  i32.const 16
  i32.shr_u
  i32.xor
  local.tee $8
  local.get $0
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $1
  block $"__inlined_func$~lib/map/Map<i32,f32>#find$228"
   loop $while-continue|0
    local.get $1
    if
     local.get $1
     i32.load offset=8
     local.tee $4
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $1
      i32.load
      local.get $3
      i32.eq
     end
     br_if $"__inlined_func$~lib/map/Map<i32,f32>#find$228"
     local.get $4
     i32.const -2
     i32.and
     local.set $1
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $1
  end
  local.get $1
  if
   local.get $1
   local.get $2
   f32.store offset=4
  else
   local.get $0
   i32.load offset=12
   local.tee $1
   local.get $0
   i32.load offset=16
   i32.eq
   if
    local.get $0
    i32.load offset=20
    local.get $1
    i32.const 3
    i32.mul
    i32.const 4
    i32.div_s
    i32.lt_s
    if (result i32)
     local.get $0
     i32.load offset=4
    else
     local.get $0
     i32.load offset=4
     i32.const 1
     i32.shl
     i32.const 1
     i32.or
    end
    local.tee $6
    i32.const 1
    i32.add
    local.tee $1
    i32.const 2
    i32.shl
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $7
    local.get $1
    i32.const 3
    i32.shl
    i32.const 3
    i32.div_s
    local.tee $9
    i32.const 12
    i32.mul
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $4
    local.get $0
    i32.load offset=8
    local.tee $5
    local.get $0
    i32.load offset=16
    i32.const 12
    i32.mul
    i32.add
    local.set $10
    local.get $4
    local.set $1
    loop $while-continue|00
     local.get $5
     local.get $10
     i32.ne
     if
      local.get $5
      i32.load offset=8
      i32.const 1
      i32.and
      i32.eqz
      if
       local.get $1
       local.get $5
       i32.load
       local.tee $11
       i32.store
       local.get $1
       local.get $5
       f32.load offset=4
       f32.store offset=4
       local.get $1
       local.get $7
       local.get $11
       i32.const -1028477379
       i32.mul
       i32.const 374761397
       i32.add
       i32.const 17
       i32.rotl
       i32.const 668265263
       i32.mul
       local.tee $11
       i32.const 15
       i32.shr_u
       local.get $11
       i32.xor
       i32.const -2048144777
       i32.mul
       local.tee $11
       i32.const 13
       i32.shr_u
       local.get $11
       i32.xor
       i32.const -1028477379
       i32.mul
       local.tee $11
       i32.const 16
       i32.shr_u
       local.get $11
       i32.xor
       local.get $6
       i32.and
       i32.const 2
       i32.shl
       i32.add
       local.tee $11
       i32.load
       i32.store offset=8
       local.get $11
       local.get $1
       i32.store
       local.get $1
       i32.const 12
       i32.add
       local.set $1
      end
      local.get $5
      i32.const 12
      i32.add
      local.set $5
      br $while-continue|00
     end
    end
    local.get $0
    local.get $7
    i32.store
    local.get $0
    local.get $6
    i32.store offset=4
    local.get $0
    local.get $4
    i32.store offset=8
    local.get $0
    local.get $9
    i32.store offset=12
    local.get $0
    local.get $0
    i32.load offset=20
    i32.store offset=16
   end
   local.get $0
   i32.load offset=8
   local.set $1
   local.get $0
   local.get $0
   i32.load offset=16
   local.tee $4
   i32.const 1
   i32.add
   i32.store offset=16
   local.get $1
   local.get $4
   i32.const 12
   i32.mul
   i32.add
   local.tee $1
   local.get $3
   i32.store
   local.get $1
   local.get $2
   f32.store offset=4
   local.get $0
   local.get $0
   i32.load offset=20
   i32.const 1
   i32.add
   i32.store offset=20
   local.get $1
   local.get $0
   i32.load
   local.get $8
   local.get $0
   i32.load offset=4
   i32.and
   i32.const 2
   i32.shl
   i32.add
   local.tee $0
   i32.load
   i32.store offset=8
   local.get $0
   local.get $1
   i32.store
  end
 )
 (func $assembly/pathfinding/reconstructPath (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32) (result i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  i32.const 0
  i32.const 9
  i32.const 1744
  call $~lib/rt/__newArray
  local.set $6
  local.get $1
  i32.const 10000
  i32.mul
  local.get $0
  i32.add
  local.set $1
  local.get $5
  i32.const 1
  i32.shl
  local.set $9
  loop $while-continue|0
   local.get $8
   local.get $9
   i32.lt_s
   if
    block $while-break|0
     local.get $6
     local.get $6
     i32.load offset=12
     local.tee $0
     i32.const 1
     i32.add
     local.tee $10
     call $~lib/array/ensureCapacity
     local.get $6
     i32.load offset=4
     local.get $0
     i32.const 2
     i32.shl
     i32.add
     local.get $1
     i32.store
     local.get $6
     local.get $10
     i32.store offset=12
     local.get $2
     i32.load
     local.get $2
     i32.load offset=4
     local.get $1
     i32.const -1028477379
     i32.mul
     i32.const 374761397
     i32.add
     i32.const 17
     i32.rotl
     i32.const 668265263
     i32.mul
     local.tee $0
     local.get $0
     i32.const 15
     i32.shr_u
     i32.xor
     i32.const -2048144777
     i32.mul
     local.tee $0
     local.get $0
     i32.const 13
     i32.shr_u
     i32.xor
     i32.const -1028477379
     i32.mul
     local.tee $0
     local.get $0
     i32.const 16
     i32.shr_u
     i32.xor
     i32.and
     i32.const 2
     i32.shl
     i32.add
     i32.load
     local.set $0
     block $"__inlined_func$~lib/map/Map<i32,f32>#find$238"
      loop $while-continue|00
       local.get $0
       if
        local.get $0
        i32.load offset=8
        local.tee $10
        i32.const 1
        i32.and
        if (result i32)
         i32.const 0
        else
         local.get $0
         i32.load
         local.get $1
         i32.eq
        end
        br_if $"__inlined_func$~lib/map/Map<i32,f32>#find$238"
        local.get $10
        i32.const -2
        i32.and
        local.set $0
        br $while-continue|00
       end
      end
      i32.const 0
      local.set $0
     end
     local.get $0
     i32.eqz
     br_if $while-break|0
     local.get $2
     i32.load
     local.get $2
     i32.load offset=4
     local.get $1
     i32.const -1028477379
     i32.mul
     i32.const 374761397
     i32.add
     i32.const 17
     i32.rotl
     i32.const 668265263
     i32.mul
     local.tee $0
     local.get $0
     i32.const 15
     i32.shr_u
     i32.xor
     i32.const -2048144777
     i32.mul
     local.tee $0
     local.get $0
     i32.const 13
     i32.shr_u
     i32.xor
     i32.const -1028477379
     i32.mul
     local.tee $0
     local.get $0
     i32.const 16
     i32.shr_u
     i32.xor
     i32.and
     i32.const 2
     i32.shl
     i32.add
     i32.load
     local.set $0
     block $"__inlined_func$~lib/map/Map<i32,f32>#find$239"
      loop $while-continue|01
       local.get $0
       if
        local.get $0
        i32.load offset=8
        local.tee $10
        i32.const 1
        i32.and
        if (result i32)
         i32.const 0
        else
         local.get $0
         i32.load
         local.get $1
         i32.eq
        end
        br_if $"__inlined_func$~lib/map/Map<i32,f32>#find$239"
        local.get $10
        i32.const -2
        i32.and
        local.set $0
        br $while-continue|01
       end
      end
      i32.const 0
      local.set $0
     end
     local.get $0
     i32.eqz
     if
      i32.const 1776
      i32.const 1840
      i32.const 105
      i32.const 17
      call $~lib/builtins/abort
      unreachable
     end
     local.get $0
     i32.load offset=4
     local.set $1
     local.get $8
     i32.const 1
     i32.add
     local.set $8
     br $while-continue|0
    end
   end
  end
  local.get $6
  i32.load offset=12
  local.tee $0
  local.get $5
  local.get $0
  local.get $5
  i32.lt_s
  select
  local.set $0
  loop $for-loop|1
   local.get $0
   local.get $7
   i32.gt_s
   if
    local.get $0
    i32.const 1
    i32.sub
    local.get $7
    i32.sub
    local.tee $1
    local.get $6
    i32.load offset=12
    i32.ge_u
    if
     i32.const 1056
     i32.const 1456
     i32.const 114
     i32.const 42
     call $~lib/builtins/abort
     unreachable
    end
    local.get $7
    i32.const 2
    i32.shl
    local.tee $2
    local.get $3
    i32.load offset=4
    i32.add
    local.get $6
    i32.load offset=4
    local.get $1
    i32.const 2
    i32.shl
    i32.add
    i32.load
    local.tee $1
    i32.const 10000
    i32.rem_s
    i32.store
    local.get $2
    local.get $4
    i32.load offset=4
    i32.add
    local.get $1
    i32.const 10000
    i32.div_s
    i32.store
    local.get $7
    i32.const 1
    i32.add
    local.set $7
    br $for-loop|1
   end
  end
  local.get $0
 )
 (func $~lib/set/Set<i32>#add (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  local.get $0
  i32.load
  local.get $1
  local.tee $2
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $1
  local.get $1
  i32.const 15
  i32.shr_u
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $1
  local.get $1
  i32.const 13
  i32.shr_u
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $1
  local.get $1
  i32.const 16
  i32.shr_u
  i32.xor
  local.tee $7
  local.get $0
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $1
  block $__inlined_func$~lib/set/Set<i32>#find$247
   loop $while-continue|0
    local.get $1
    if
     local.get $1
     i32.load offset=4
     local.tee $3
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $1
      i32.load
      local.get $2
      i32.eq
     end
     br_if $__inlined_func$~lib/set/Set<i32>#find$247
     local.get $3
     i32.const -2
     i32.and
     local.set $1
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $1
  end
  local.get $1
  i32.eqz
  if
   local.get $0
   i32.load offset=12
   local.tee $1
   local.get $0
   i32.load offset=16
   i32.eq
   if
    local.get $0
    i32.load offset=20
    local.get $1
    i32.const 3
    i32.mul
    i32.const 4
    i32.div_s
    i32.lt_s
    if (result i32)
     local.get $0
     i32.load offset=4
    else
     local.get $0
     i32.load offset=4
     i32.const 1
     i32.shl
     i32.const 1
     i32.or
    end
    local.tee $5
    i32.const 1
    i32.add
    local.tee $1
    i32.const 2
    i32.shl
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $6
    local.get $1
    i32.const 3
    i32.shl
    i32.const 3
    i32.div_s
    local.tee $8
    i32.const 3
    i32.shl
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $3
    local.get $0
    i32.load offset=8
    local.tee $4
    local.get $0
    i32.load offset=16
    i32.const 3
    i32.shl
    i32.add
    local.set $9
    local.get $3
    local.set $1
    loop $while-continue|00
     local.get $4
     local.get $9
     i32.ne
     if
      local.get $4
      i32.load offset=4
      i32.const 1
      i32.and
      i32.eqz
      if
       local.get $1
       local.get $4
       i32.load
       local.tee $10
       i32.store
       local.get $1
       local.get $6
       local.get $10
       i32.const -1028477379
       i32.mul
       i32.const 374761397
       i32.add
       i32.const 17
       i32.rotl
       i32.const 668265263
       i32.mul
       local.tee $10
       i32.const 15
       i32.shr_u
       local.get $10
       i32.xor
       i32.const -2048144777
       i32.mul
       local.tee $10
       i32.const 13
       i32.shr_u
       local.get $10
       i32.xor
       i32.const -1028477379
       i32.mul
       local.tee $10
       i32.const 16
       i32.shr_u
       local.get $10
       i32.xor
       local.get $5
       i32.and
       i32.const 2
       i32.shl
       i32.add
       local.tee $10
       i32.load
       i32.store offset=4
       local.get $10
       local.get $1
       i32.store
       local.get $1
       i32.const 8
       i32.add
       local.set $1
      end
      local.get $4
      i32.const 8
      i32.add
      local.set $4
      br $while-continue|00
     end
    end
    local.get $0
    local.get $6
    i32.store
    local.get $0
    local.get $5
    i32.store offset=4
    local.get $0
    local.get $3
    i32.store offset=8
    local.get $0
    local.get $8
    i32.store offset=12
    local.get $0
    local.get $0
    i32.load offset=20
    i32.store offset=16
   end
   local.get $0
   i32.load offset=8
   local.set $1
   local.get $0
   local.get $0
   i32.load offset=16
   local.tee $3
   i32.const 1
   i32.add
   i32.store offset=16
   local.get $1
   local.get $3
   i32.const 3
   i32.shl
   i32.add
   local.tee $1
   local.get $2
   i32.store
   local.get $0
   local.get $0
   i32.load offset=20
   i32.const 1
   i32.add
   i32.store offset=20
   local.get $1
   local.get $0
   i32.load
   local.get $7
   local.get $0
   i32.load offset=4
   i32.and
   i32.const 2
   i32.shl
   i32.add
   local.tee $0
   i32.load
   i32.store offset=4
   local.get $0
   local.get $1
   i32.store
  end
 )
 (func $"~lib/map/Map<i32,i32>#set" (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  local.get $0
  i32.load
  local.get $1
  local.tee $3
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $1
  local.get $1
  i32.const 15
  i32.shr_u
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $1
  local.get $1
  i32.const 13
  i32.shr_u
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $1
  local.get $1
  i32.const 16
  i32.shr_u
  i32.xor
  local.tee $8
  local.get $0
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $1
  block $"__inlined_func$~lib/map/Map<i32,f32>#find$252"
   loop $while-continue|0
    local.get $1
    if
     local.get $1
     i32.load offset=8
     local.tee $4
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $1
      i32.load
      local.get $3
      i32.eq
     end
     br_if $"__inlined_func$~lib/map/Map<i32,f32>#find$252"
     local.get $4
     i32.const -2
     i32.and
     local.set $1
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $1
  end
  local.get $1
  if
   local.get $1
   local.get $2
   i32.store offset=4
  else
   local.get $0
   i32.load offset=12
   local.tee $1
   local.get $0
   i32.load offset=16
   i32.eq
   if
    local.get $0
    i32.load offset=20
    local.get $1
    i32.const 3
    i32.mul
    i32.const 4
    i32.div_s
    i32.lt_s
    if (result i32)
     local.get $0
     i32.load offset=4
    else
     local.get $0
     i32.load offset=4
     i32.const 1
     i32.shl
     i32.const 1
     i32.or
    end
    local.tee $6
    i32.const 1
    i32.add
    local.tee $1
    i32.const 2
    i32.shl
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $7
    local.get $1
    i32.const 3
    i32.shl
    i32.const 3
    i32.div_s
    local.tee $9
    i32.const 12
    i32.mul
    call $~lib/arraybuffer/ArrayBuffer#constructor
    local.set $4
    local.get $0
    i32.load offset=8
    local.tee $5
    local.get $0
    i32.load offset=16
    i32.const 12
    i32.mul
    i32.add
    local.set $10
    local.get $4
    local.set $1
    loop $while-continue|00
     local.get $5
     local.get $10
     i32.ne
     if
      local.get $5
      i32.load offset=8
      i32.const 1
      i32.and
      i32.eqz
      if
       local.get $1
       local.get $5
       i32.load
       local.tee $11
       i32.store
       local.get $1
       local.get $5
       i32.load offset=4
       i32.store offset=4
       local.get $1
       local.get $7
       local.get $11
       i32.const -1028477379
       i32.mul
       i32.const 374761397
       i32.add
       i32.const 17
       i32.rotl
       i32.const 668265263
       i32.mul
       local.tee $11
       i32.const 15
       i32.shr_u
       local.get $11
       i32.xor
       i32.const -2048144777
       i32.mul
       local.tee $11
       i32.const 13
       i32.shr_u
       local.get $11
       i32.xor
       i32.const -1028477379
       i32.mul
       local.tee $11
       i32.const 16
       i32.shr_u
       local.get $11
       i32.xor
       local.get $6
       i32.and
       i32.const 2
       i32.shl
       i32.add
       local.tee $11
       i32.load
       i32.store offset=8
       local.get $11
       local.get $1
       i32.store
       local.get $1
       i32.const 12
       i32.add
       local.set $1
      end
      local.get $5
      i32.const 12
      i32.add
      local.set $5
      br $while-continue|00
     end
    end
    local.get $0
    local.get $7
    i32.store
    local.get $0
    local.get $6
    i32.store offset=4
    local.get $0
    local.get $4
    i32.store offset=8
    local.get $0
    local.get $9
    i32.store offset=12
    local.get $0
    local.get $0
    i32.load offset=20
    i32.store offset=16
   end
   local.get $0
   i32.load offset=8
   local.set $1
   local.get $0
   local.get $0
   i32.load offset=16
   local.tee $4
   i32.const 1
   i32.add
   i32.store offset=16
   local.get $1
   local.get $4
   i32.const 12
   i32.mul
   i32.add
   local.tee $1
   local.get $3
   i32.store
   local.get $1
   local.get $2
   i32.store offset=4
   local.get $0
   local.get $0
   i32.load offset=20
   i32.const 1
   i32.add
   i32.store offset=20
   local.get $1
   local.get $0
   i32.load
   local.get $8
   local.get $0
   i32.load offset=4
   i32.and
   i32.const 2
   i32.shl
   i32.add
   local.tee $0
   i32.load
   i32.store offset=8
   local.get $0
   local.get $1
   i32.store
  end
 )
 (func $assembly/pathfinding/findPath (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32) (param $6 i32) (param $7 i32) (param $8 i32) (param $9 i32) (result i32)
  (local $10 i32)
  (local $11 i32)
  (local $12 f32)
  (local $13 i32)
  (local $14 i32)
  (local $15 i32)
  (local $16 i32)
  (local $17 i32)
  (local $18 i32)
  (local $19 i32)
  (local $20 i32)
  (local $21 i32)
  (local $22 i32)
  (local $23 i32)
  local.get $6
  i32.const 20
  i32.sub
  i32.load offset=16
  local.set $10
  local.get $4
  local.get $5
  i32.mul
  local.tee $11
  i32.const 0
  i32.lt_s
  if
   local.get $11
   i32.const -1
   i32.ne
   if
    i32.const 1184
    i32.const 1120
    i32.const 1869
    i32.const 7
    call $~lib/builtins/abort
    unreachable
   end
   local.get $10
   local.set $11
  else
   local.get $10
   local.get $11
   i32.lt_s
   if
    i32.const 1184
    i32.const 1120
    i32.const 1874
    i32.const 7
    call $~lib/builtins/abort
    unreachable
   end
  end
  i32.const 12
  i32.const 4
  call $~lib/rt/stub/__new
  local.tee $20
  local.get $6
  i32.store
  local.get $20
  local.get $11
  i32.store offset=8
  local.get $20
  local.get $6
  i32.store offset=4
  local.get $7
  local.get $9
  call $~lib/typedarray/Int32Array.wrap
  local.set $19
  local.get $8
  local.get $9
  call $~lib/typedarray/Int32Array.wrap
  local.set $18
  local.get $2
  local.get $3
  i32.or
  i32.const 0
  i32.lt_s
  local.get $2
  local.get $4
  i32.ge_s
  i32.or
  local.get $3
  local.get $5
  i32.ge_s
  i32.or
  if (result i32)
   i32.const 1
  else
   local.get $20
   i32.load offset=4
   local.get $3
   local.get $4
   i32.mul
   local.get $2
   i32.add
   i32.add
   i32.load8_u
  end
  if
   i32.const 0
   return
  end
  local.get $1
  local.get $3
  i32.eq
  local.get $0
  local.get $2
  i32.eq
  i32.and
  if
   local.get $19
   i32.load offset=4
   local.get $0
   i32.store
   local.get $18
   i32.load offset=4
   local.get $1
   i32.store
   i32.const 1
   return
  end
  i32.const 4
  i32.const 6
  call $~lib/rt/stub/__new
  local.tee $6
  i32.eqz
  if
   i32.const 0
   i32.const 0
   call $~lib/rt/stub/__new
   local.set $6
  end
  local.get $6
  i32.const 0
  i32.const 8
  i32.const 1360
  call $~lib/rt/__newArray
  i32.store
  i32.const 24
  i32.const 10
  call $~lib/rt/stub/__new
  local.tee $22
  i32.const 16
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store
  local.get $22
  i32.const 3
  i32.store offset=4
  local.get $22
  i32.const 32
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store offset=8
  local.get $22
  i32.const 4
  i32.store offset=12
  local.get $22
  i32.const 0
  i32.store offset=16
  local.get $22
  i32.const 0
  i32.store offset=20
  i32.const 24
  i32.const 11
  call $~lib/rt/stub/__new
  local.tee $21
  i32.const 16
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store
  local.get $21
  i32.const 3
  i32.store offset=4
  local.get $21
  i32.const 48
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store offset=8
  local.get $21
  i32.const 4
  i32.store offset=12
  local.get $21
  i32.const 0
  i32.store offset=16
  local.get $21
  i32.const 0
  i32.store offset=20
  local.get $6
  local.get $0
  local.get $1
  f32.const 0
  local.get $0
  local.get $2
  i32.sub
  local.tee $8
  i32.const 31
  i32.shr_s
  local.tee $7
  local.get $7
  local.get $8
  i32.add
  i32.xor
  local.get $1
  local.get $3
  i32.sub
  local.tee $8
  i32.const 31
  i32.shr_s
  local.tee $7
  local.get $7
  local.get $8
  i32.add
  i32.xor
  i32.add
  f32.convert_i32_s
  i32.const -1
  i32.const -1
  call $assembly/pathfinding/PathNode#constructor
  call $assembly/pathfinding/PriorityQueue#push
  i32.const 24
  i32.const 12
  call $~lib/rt/stub/__new
  local.tee $17
  i32.const 16
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store
  local.get $17
  i32.const 3
  i32.store offset=4
  local.get $17
  i32.const 48
  call $~lib/arraybuffer/ArrayBuffer#constructor
  i32.store offset=8
  local.get $17
  i32.const 4
  i32.store offset=12
  local.get $17
  i32.const 0
  i32.store offset=16
  local.get $17
  i32.const 0
  i32.store offset=20
  local.get $17
  local.get $1
  i32.const 10000
  i32.mul
  local.get $0
  i32.add
  f32.const 0
  call $"~lib/map/Map<i32,f32>#set"
  i32.const 8
  i32.const 9
  i32.const 1632
  call $~lib/rt/__newArray
  local.set $16
  local.get $4
  local.get $5
  i32.mul
  local.set $15
  loop $while-continue|0
   local.get $6
   i32.load
   local.tee $1
   i32.load offset=12
   local.tee $0
   i32.const 0
   i32.ne
   local.get $15
   local.get $23
   i32.gt_s
   i32.and
   if
    block $while-break|0
     local.get $23
     i32.const 1
     i32.add
     local.set $23
     local.get $0
     if (result i32)
      local.get $1
      i32.const 0
      call $~lib/array/Array<assembly/pathfinding/PathNode>#__get
      local.set $13
      local.get $6
      i32.load
      local.tee $7
      i32.load offset=12
      local.tee $0
      i32.const 0
      i32.le_s
      if
       i32.const 1696
       i32.const 1456
       i32.const 271
       i32.const 18
       call $~lib/builtins/abort
       unreachable
      end
      local.get $7
      i32.load offset=4
      local.get $0
      i32.const 1
      i32.sub
      local.tee $0
      i32.const 2
      i32.shl
      i32.add
      i32.load
      local.set $1
      local.get $7
      local.get $0
      i32.store offset=12
      local.get $1
      i32.const 0
      local.get $6
      i32.load
      local.tee $0
      i32.load offset=12
      i32.const 0
      i32.gt_s
      select
      if
       local.get $0
       i32.const 0
       local.get $1
       call $~lib/array/Array<assembly/pathfinding/PathNode>#__set
       i32.const 0
       local.set $1
       local.get $6
       i32.load
       local.tee $0
       i32.load offset=12
       local.set $11
       local.get $0
       i32.const 0
       call $~lib/array/Array<assembly/pathfinding/PathNode>#__get
       local.set $10
       loop $while-continue|00
        local.get $1
        local.get $1
        i32.const 1
        i32.shl
        i32.const 1
        i32.add
        local.tee $0
        i32.const 1
        i32.add
        local.tee $8
        local.get $0
        local.get $1
        local.get $0
        local.get $11
        i32.lt_s
        if (result i32)
         local.get $6
         i32.load
         local.get $0
         call $~lib/array/Array<assembly/pathfinding/PathNode>#__get
         local.tee $0
         f32.load offset=8
         local.get $0
         f32.load offset=12
         f32.add
         local.get $6
         i32.load
         local.get $1
         call $~lib/array/Array<assembly/pathfinding/PathNode>#__get
         local.tee $0
         f32.load offset=8
         local.get $0
         f32.load offset=12
         f32.add
         f32.lt
        else
         i32.const 0
        end
        select
        local.tee $7
        local.get $8
        local.get $11
        i32.lt_s
        if (result i32)
         local.get $6
         i32.load
         local.get $8
         call $~lib/array/Array<assembly/pathfinding/PathNode>#__get
         local.tee $0
         f32.load offset=8
         local.get $0
         f32.load offset=12
         f32.add
         local.get $6
         i32.load
         local.get $7
         call $~lib/array/Array<assembly/pathfinding/PathNode>#__get
         local.tee $0
         f32.load offset=8
         local.get $0
         f32.load offset=12
         f32.add
         f32.lt
        else
         i32.const 0
        end
        select
        local.tee $0
        i32.ne
        if
         local.get $6
         i32.load
         local.tee $7
         local.get $1
         local.get $7
         local.get $0
         call $~lib/array/Array<assembly/pathfinding/PathNode>#__get
         call $~lib/array/Array<assembly/pathfinding/PathNode>#__set
         local.get $0
         local.set $1
         br $while-continue|00
        end
       end
       local.get $6
       i32.load
       local.get $1
       local.get $10
       call $~lib/array/Array<assembly/pathfinding/PathNode>#__set
      end
      local.get $13
     else
      i32.const 0
     end
     local.tee $14
     i32.eqz
     br_if $while-break|0
     local.get $14
     i32.load
     local.tee $1
     local.get $14
     i32.load offset=4
     local.tee $0
     i32.const 10000
     i32.mul
     i32.add
     local.set $13
     local.get $0
     local.get $3
     i32.eq
     local.get $1
     local.get $2
     i32.eq
     i32.and
     if
      local.get $2
      local.get $3
      local.get $21
      local.get $19
      local.get $18
      local.get $9
      call $assembly/pathfinding/reconstructPath
      return
     end
     local.get $22
     local.get $13
     call $~lib/set/Set<i32>#add
     i32.const 0
     local.set $1
     loop $for-loop|1
      local.get $1
      i32.const 4
      i32.lt_s
      if
       block $for-continue|1
        local.get $14
        i32.load offset=4
        local.get $16
        i32.load offset=4
        local.tee $0
        local.get $1
        i32.const 1
        i32.shl
        i32.const 1
        i32.add
        i32.const 2
        i32.shl
        i32.add
        i32.load
        i32.add
        local.tee $11
        local.get $14
        i32.load
        local.get $0
        local.get $1
        i32.const 3
        i32.shl
        i32.add
        i32.load
        i32.add
        local.tee $10
        i32.or
        i32.const 0
        i32.lt_s
        local.get $4
        local.get $10
        i32.le_s
        i32.or
        local.get $5
        local.get $11
        i32.le_s
        i32.or
        if (result i32)
         i32.const 1
        else
         local.get $20
         i32.load offset=4
         local.get $4
         local.get $11
         i32.mul
         local.get $10
         i32.add
         i32.add
         i32.load8_u
        end
        br_if $for-continue|1
        local.get $22
        i32.load
        local.get $22
        i32.load offset=4
        local.get $11
        i32.const 10000
        i32.mul
        local.get $10
        i32.add
        local.tee $8
        i32.const -1028477379
        i32.mul
        i32.const 374761397
        i32.add
        i32.const 17
        i32.rotl
        i32.const 668265263
        i32.mul
        local.tee $0
        i32.const 15
        i32.shr_u
        local.get $0
        i32.xor
        i32.const -2048144777
        i32.mul
        local.tee $0
        i32.const 13
        i32.shr_u
        local.get $0
        i32.xor
        i32.const -1028477379
        i32.mul
        local.tee $0
        i32.const 16
        i32.shr_u
        local.get $0
        i32.xor
        i32.and
        i32.const 2
        i32.shl
        i32.add
        i32.load
        local.set $0
        block $__inlined_func$~lib/set/Set<i32>#find$248
         loop $while-continue|01
          local.get $0
          if
           local.get $0
           i32.load offset=4
           local.tee $7
           i32.const 1
           i32.and
           if (result i32)
            i32.const 0
           else
            local.get $8
            local.get $0
            i32.load
            i32.eq
           end
           br_if $__inlined_func$~lib/set/Set<i32>#find$248
           local.get $7
           i32.const -2
           i32.and
           local.set $0
           br $while-continue|01
          end
         end
         i32.const 0
         local.set $0
        end
        local.get $0
        br_if $for-continue|1
        local.get $14
        f32.load offset=8
        f32.const 1
        f32.add
        local.set $12
        local.get $17
        i32.load
        local.get $17
        i32.load offset=4
        local.get $8
        i32.const -1028477379
        i32.mul
        i32.const 374761397
        i32.add
        i32.const 17
        i32.rotl
        i32.const 668265263
        i32.mul
        local.tee $0
        local.get $0
        i32.const 15
        i32.shr_u
        i32.xor
        i32.const -2048144777
        i32.mul
        local.tee $0
        local.get $0
        i32.const 13
        i32.shr_u
        i32.xor
        i32.const -1028477379
        i32.mul
        local.tee $0
        local.get $0
        i32.const 16
        i32.shr_u
        i32.xor
        i32.and
        i32.const 2
        i32.shl
        i32.add
        i32.load
        local.set $0
        block $"__inlined_func$~lib/map/Map<i32,f32>#find$238"
         loop $while-continue|02
          local.get $0
          if
           local.get $0
           i32.load offset=8
           local.tee $7
           i32.const 1
           i32.and
           if (result i32)
            i32.const 0
           else
            local.get $0
            i32.load
            local.get $8
            i32.eq
           end
           br_if $"__inlined_func$~lib/map/Map<i32,f32>#find$238"
           local.get $7
           i32.const -2
           i32.and
           local.set $0
           br $while-continue|02
          end
         end
         i32.const 0
         local.set $0
        end
        local.get $0
        if (result f32)
         local.get $17
         i32.load
         local.get $17
         i32.load offset=4
         local.get $8
         i32.const -1028477379
         i32.mul
         i32.const 374761397
         i32.add
         i32.const 17
         i32.rotl
         i32.const 668265263
         i32.mul
         local.tee $0
         i32.const 15
         i32.shr_u
         local.get $0
         i32.xor
         i32.const -2048144777
         i32.mul
         local.tee $0
         i32.const 13
         i32.shr_u
         local.get $0
         i32.xor
         i32.const -1028477379
         i32.mul
         local.tee $0
         i32.const 16
         i32.shr_u
         local.get $0
         i32.xor
         i32.and
         i32.const 2
         i32.shl
         i32.add
         i32.load
         local.set $0
         block $"__inlined_func$~lib/map/Map<i32,f32>#find$249"
          loop $while-continue|023
           local.get $0
           if
            local.get $0
            i32.load offset=8
            local.tee $7
            i32.const 1
            i32.and
            if (result i32)
             i32.const 0
            else
             local.get $8
             local.get $0
             i32.load
             i32.eq
            end
            br_if $"__inlined_func$~lib/map/Map<i32,f32>#find$249"
            local.get $7
            i32.const -2
            i32.and
            local.set $0
            br $while-continue|023
           end
          end
          i32.const 0
          local.set $0
         end
         local.get $0
         i32.eqz
         if
          i32.const 1776
          i32.const 1840
          i32.const 105
          i32.const 17
          call $~lib/builtins/abort
          unreachable
         end
         local.get $0
         f32.load offset=4
        else
         f32.const 3402823466385288598117041e14
        end
        local.get $12
        f32.gt
        if
         local.get $17
         local.get $8
         local.get $12
         call $"~lib/map/Map<i32,f32>#set"
         local.get $21
         local.get $8
         local.get $13
         call $"~lib/map/Map<i32,i32>#set"
         local.get $6
         local.get $10
         local.get $11
         local.get $12
         local.get $10
         local.get $2
         i32.sub
         local.tee $7
         i32.const 31
         i32.shr_s
         local.tee $0
         local.get $0
         local.get $7
         i32.add
         i32.xor
         local.get $11
         local.get $3
         i32.sub
         local.tee $0
         i32.const 31
         i32.shr_s
         local.tee $7
         local.get $0
         local.get $7
         i32.add
         i32.xor
         i32.add
         f32.convert_i32_s
         local.get $14
         i32.load
         local.get $14
         i32.load offset=4
         call $assembly/pathfinding/PathNode#constructor
         call $assembly/pathfinding/PriorityQueue#push
        end
       end
       local.get $1
       i32.const 1
       i32.add
       local.set $1
       br $for-loop|1
      end
     end
     br $while-continue|0
    end
   end
  end
  i32.const 0
 )
 (func $~lib/arraybuffer/ArrayBufferView#constructor (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  local.get $0
  i32.eqz
  if
   i32.const 12
   i32.const 3
   call $~lib/rt/stub/__new
   local.set $0
  end
  local.get $0
  i32.const 0
  i32.store
  local.get $0
  i32.const 0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 1073741820
  local.get $2
  i32.shr_u
  i32.gt_u
  if
   i32.const 1184
   i32.const 1392
   i32.const 19
   i32.const 57
   call $~lib/builtins/abort
   unreachable
  end
  local.get $1
  local.get $2
  i32.shl
  local.tee $1
  i32.const 1
  call $~lib/rt/stub/__new
  local.tee $2
  i32.const 0
  local.get $1
  memory.fill
  local.get $0
  local.get $2
  i32.store
  local.get $0
  local.get $2
  i32.store offset=4
  local.get $0
  local.get $1
  i32.store offset=8
  local.get $0
 )
 (func $assembly/pathfinding/allocateObstacles (param $0 i32) (result i32)
  i32.const 12
  i32.const 4
  call $~lib/rt/stub/__new
  local.get $0
  i32.const 0
  call $~lib/arraybuffer/ArrayBufferView#constructor
  i32.load
 )
 (func $assembly/pathfinding/allocateOutput (param $0 i32) (result i32)
  i32.const 12
  i32.const 5
  call $~lib/rt/stub/__new
  local.get $0
  i32.const 2
  call $~lib/arraybuffer/ArrayBufferView#constructor
  i32.load
 )
 (func $assembly/pathfinding/getMemorySize (result i32)
  memory.size
  i32.const 16
  i32.shl
 )
 (func $~lib/rt/stub/__pin (param $0 i32) (result i32)
  local.get $0
 )
 (func $~lib/rt/stub/__unpin (param $0 i32)
 )
 (func $~lib/rt/stub/__collect
 )
 (func $~start
  i32.const 1932
  global.set $~lib/rt/stub/offset
 )
)
