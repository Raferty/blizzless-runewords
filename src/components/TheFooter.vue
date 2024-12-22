<template>
  <footer class="footer">
    <div class="container">
      <div>
        <a href="https://discord.gg/TJgm9ZAhwW" target="_blank">Discord</a>
      </div>
      inspired by
      <a class="footer__link" href="https://github.com/fabd/diablo2-runewizard"
        >fabd/diablo2-runewizard</a
      >
    </div>
  </footer>
</template>

<script setup></script>

<style lang="scss" scoped>
.footer {
  margin-top: 32px;
  padding: 16px 0;
  text-align: center;
  //margin: 0 auto;
  max-width: 1100px;
  border-top: 4px solid #bab197;

  &__link {
    font-weight: 700;
  }
}

.container {
  padding-left: 8px;
  padding-right: 8px;

  @media (min-width: 1024px) {
    padding-left: 16px;
    padding-right: 16px;
  }
}
</style>
