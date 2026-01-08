<template>
  <div
    class="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 animate-gradient relative overflow-hidden"
  >
    <!-- Animated background elements -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        class="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary-500/20 blur-3xl animate-float-slow"
      ></div>
      <div
        class="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/20 blur-3xl animate-float-medium"
      ></div>
      <div
        class="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-indigo-500/20 blur-3xl animate-float-fast"
      ></div>
    </div>

    <div class="sm:mx-auto sm:w-full sm:max-w-[420px] relative z-10">
      <div
        class="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl py-8 px-4 shadow-2xl ring-1 ring-gray-900/5 sm:rounded-2xl sm:px-10 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 hover:shadow-primary-500/10"
      >
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
  @keyframes gradient {
    0% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
    100% {
      background-position: 0% 50%;
    }
  }

  .animate-gradient {
    background-size: 400% 400%;
    animation: gradient 15s ease infinite;
  }

  @keyframes float {
    0% {
      transform: translate(0, 0) rotate(0deg);
    }
    33% {
      transform: translate(30px, -50px) rotate(10deg);
    }
    66% {
      transform: translate(-20px, 20px) rotate(-5deg);
    }
    100% {
      transform: translate(0, 0) rotate(0deg);
    }
  }

  .animate-float-slow {
    animation: float 20s infinite ease-in-out;
  }
  .animate-float-medium {
    animation: float 15s infinite ease-in-out reverse;
  }
  .animate-float-fast {
    animation: float 12s infinite ease-in-out;
  }
</style>
